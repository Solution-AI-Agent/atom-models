import type { IPlaygroundParameters } from '@/lib/types/playground'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

interface StreamChatOptions {
  readonly model: string
  readonly messages: readonly ChatMessage[]
  readonly parameters: IPlaygroundParameters
}

export async function streamChatCompletion(
  options: StreamChatOptions,
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.parameters.temperature,
      max_tokens: options.parameters.maxTokens,
      top_p: options.parameters.topP,
      ...(options.parameters.reasoningEffort && {
        reasoning: { effort: options.parameters.reasoningEffort },
      }),
      stream: true,
      stream_options: { include_usage: true },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${error}`)
  }

  return response
}

interface CompleteChatOptions {
  readonly model: string
  readonly messages: readonly ChatMessage[]
  readonly temperature?: number
  readonly maxTokens?: number
}

interface CompleteChatResult {
  readonly content: string
  readonly usage: {
    readonly promptTokens: number
    readonly completionTokens: number
  }
}

export async function completeChatCompletion(
  options: CompleteChatOptions,
): Promise<CompleteChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0,
      max_tokens: options.maxTokens ?? 1024,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 }

  return {
    content,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
    },
  }
}
