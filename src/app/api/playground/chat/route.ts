import { z } from 'zod'
import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import { streamChatCompletion } from '@/lib/services/openrouter.service'

const chatRequestSchema = z.object({
  sessionId: z.string(),
  modelId: z.string(),
  openRouterModelId: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1).max(50000),
  })).min(1),
  parameters: z.object({
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(128000),
    topP: z.number().min(0).max(1),
  }),
})

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_MINUTE = 20

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= MAX_REQUESTS_PER_MINUTE) return false
  rateLimitMap.set(ip, { ...entry, count: entry.count + 1 })
  return true
}

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const body = await request.json()
    const parsed = chatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const validated = parsed.data

    await getConnection()
    const model = await ModelModel.findOne({ openRouterModelId: validated.openRouterModelId }).lean()
    if (!model) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unknown model' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const openRouterResponse = await streamChatCompletion({
      model: validated.openRouterModelId,
      messages: validated.messages,
      parameters: validated.parameters,
    })

    if (!openRouterResponse.body) {
      return new Response(
        JSON.stringify({ success: false, error: 'No stream body from OpenRouter' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const reader = openRouterResponse.body.getReader()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let closed = false
        let buffer = ''

        function closeStream() {
          if (!closed) {
            closed = true
            controller.close()
          }
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              closeStream()
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()

              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                closeStream()
                return
              }

              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta
                const content = delta?.content || ''
                const reasoning = delta?.reasoning || ''
                const usage = parsed.usage || null

                if (usage) {
                  const event = {
                    type: 'done',
                    usage: {
                      promptTokens: usage.prompt_tokens,
                      completionTokens: usage.completion_tokens,
                    },
                  }
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                  )
                } else if (reasoning) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', content: reasoning })}\n\n`),
                  )
                } else if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`),
                  )
                }
              } catch {
                // skip unparseable lines
              }
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Stream error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`),
          )
          closeStream()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to start chat stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
