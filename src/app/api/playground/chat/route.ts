import { streamChatCompletion } from '@/lib/services/openrouter.service'
import type { IPlaygroundChatRequest } from '@/lib/types/playground'

export async function POST(request: Request) {
  try {
    const body: IPlaygroundChatRequest = await request.json()

    if (!body.openRouterModelId || !body.messages || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const openRouterResponse = await streamChatCompletion({
      model: body.openRouterModelId,
      messages: body.messages,
      parameters: body.parameters,
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
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()

              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                return
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                const usage = parsed.usage || null

                const event: Record<string, unknown> = { type: 'token', content }
                if (usage) {
                  event.type = 'done'
                  event.usage = {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                  }
                }

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                )
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
          controller.close()
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
