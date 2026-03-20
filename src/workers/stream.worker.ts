import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'
import type { WorkerInboundMessage, WorkerOutboundMessage } from '@/lib/types/worker-messages'

interface MetricsInput {
  startTime: number
  endTime: number
  contentFirstTokenTime: number | null
  contentLastTokenTime: number | null
  contentChunkCount: number
  reasoningFirstTokenTime: number | null
  reasoningLastTokenTime: number | null
  reasoningChunkCount: number
  usage: { promptTokens: number; completionTokens: number; reasoningTokens?: number } | null
  pricing: { inputPer1m: number | null; outputPer1m: number | null }
}

export function parseSSELine(line: string): Record<string, unknown> | null {
  if (!line.startsWith('data: ')) {
    return null
  }

  const data = line.slice('data: '.length)

  if (data === '[DONE]') {
    return { done: true }
  }

  try {
    return JSON.parse(data) as Record<string, unknown>
  } catch {
    return null
  }
}

function calcTps(
  tokenCount: number,
  firstTokenTime: number | null,
  lastTokenTime: number | null,
): number {
  if (firstTokenTime === null || lastTokenTime === null || tokenCount <= 1) {
    return 0
  }
  const durationSeconds = (lastTokenTime - firstTokenTime) / 1000
  if (durationSeconds <= 0) {
    return 0
  }
  return Math.round((tokenCount / durationSeconds) * 10) / 10
}

export function calculateMetrics(data: MetricsInput): IPlaygroundMessageMetrics {
  const {
    startTime,
    endTime,
    contentFirstTokenTime,
    contentLastTokenTime,
    contentChunkCount,
    reasoningFirstTokenTime,
    reasoningLastTokenTime,
    reasoningChunkCount,
    usage,
    pricing,
  } = data

  const totalTime = Math.round(endTime - startTime)

  const reasoningTtft =
    reasoningFirstTokenTime !== null ? Math.round(reasoningFirstTokenTime - startTime) : null

  const contentTtft =
    contentFirstTokenTime !== null ? Math.round(contentFirstTokenTime - startTime) : 0

  const reasoningTokens = usage?.reasoningTokens ?? reasoningChunkCount
  const contentTokens = Math.max(0, (usage?.completionTokens ?? contentChunkCount) - reasoningTokens)
  const inputTokens = usage?.promptTokens ?? 0

  const reasoningTps =
    reasoningFirstTokenTime !== null
      ? calcTps(reasoningTokens, reasoningFirstTokenTime, reasoningLastTokenTime)
      : null

  const contentTps = calcTps(contentTokens, contentFirstTokenTime, contentLastTokenTime)

  const estimatedCost =
    Math.round(
      ((inputTokens * (pricing.inputPer1m ?? 0) +
        (reasoningTokens + contentTokens) * (pricing.outputPer1m ?? 0)) /
        1_000_000) *
        1_000_000,
    ) / 1_000_000

  return {
    reasoningTtft,
    reasoningTps,
    reasoningTokens,
    contentTtft,
    contentTps,
    contentTokens,
    totalTime,
    inputTokens,
    estimatedCost,
  }
}

// Worker handler — only runs in Worker context, not during Jest tests
if (typeof self !== 'undefined' && typeof (self as typeof globalThis & { postMessage?: unknown }).postMessage === 'function') {
  let abortController: AbortController | null = null

  ;(self as typeof globalThis).onmessage = async (e: MessageEvent<WorkerInboundMessage>) => {
    const msg = e.data

    if (msg.type === 'abort') {
      abortController?.abort()
      return
    }

    if (msg.type === 'start') {
      abortController = new AbortController()
      const startTime = performance.now()

      let contentAccumulated = ''
      let reasoningAccumulated = ''
      let contentFirstTokenTime: number | null = null
      let contentLastTokenTime: number | null = null
      let contentChunkCount = 0
      let reasoningFirstTokenTime: number | null = null
      let reasoningLastTokenTime: number | null = null
      let reasoningChunkCount = 0
      let usage: { promptTokens: number; completionTokens: number; reasoningTokens?: number } | null = null

      try {
        const res = await fetch(msg.apiBaseUrl + '/api/playground/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: '',
            modelId: msg.modelId,
            openRouterModelId: msg.openRouterModelId,
            messages: msg.messages,
            parameters: msg.parameters,
          }),
          signal: abortController.signal,
        })

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => 'Unknown error')
          ;(self as typeof globalThis).postMessage({ type: 'error', error: errText } satisfies WorkerOutboundMessage)
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let consecutiveParseFailures = 0

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            // Flush remaining buffer
            if (buffer.trim()) {
              for (const line of buffer.split('\n')) {
                parseSSELine(line.trim())
              }
            }
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line) continue

            const parsed = parseSSELine(line)

            if (parsed === null) {
              consecutiveParseFailures++
              if (consecutiveParseFailures >= 10) {
                ;(self as typeof globalThis).postMessage({
                  type: 'error',
                  error: 'Stream parse error: too many consecutive failures',
                } satisfies WorkerOutboundMessage)
                return
              }
              continue
            }

            consecutiveParseFailures = 0

            if ('done' in parsed && parsed.done === true) {
              break
            }

            const event = parsed as { type?: string; content?: string; usage?: { promptTokens: number; completionTokens: number; reasoningTokens?: number } }

            if (event.type === 'token' && typeof event.content === 'string') {
              const now = performance.now()
              if (contentFirstTokenTime === null) contentFirstTokenTime = now
              contentLastTokenTime = now
              contentChunkCount++
              contentAccumulated += event.content
              ;(self as typeof globalThis).postMessage({ type: 'token', content: event.content } satisfies WorkerOutboundMessage)
            } else if (event.type === 'reasoning' && typeof event.content === 'string') {
              const now = performance.now()
              if (reasoningFirstTokenTime === null) reasoningFirstTokenTime = now
              reasoningLastTokenTime = now
              reasoningChunkCount++
              reasoningAccumulated += event.content
              ;(self as typeof globalThis).postMessage({ type: 'reasoning', content: event.content } satisfies WorkerOutboundMessage)
            } else if (event.type === 'done') {
              if (event.usage) {
                usage = event.usage
              }

              const endTime = performance.now()
              const metrics = calculateMetrics({
                startTime,
                endTime,
                contentFirstTokenTime,
                contentLastTokenTime,
                contentChunkCount,
                reasoningFirstTokenTime,
                reasoningLastTokenTime,
                reasoningChunkCount,
                usage,
                pricing: msg.pricing,
              })

              ;(self as typeof globalThis).postMessage({
                type: 'done',
                content: contentAccumulated,
                reasoning: reasoningAccumulated,
                metrics,
              } satisfies WorkerOutboundMessage)
              return
            } else if (event.type === 'error') {
              ;(self as typeof globalThis).postMessage({
                type: 'error',
                error: typeof (event as Record<string, unknown>).error === 'string'
                  ? (event as Record<string, unknown>).error as string
                  : 'Stream error',
              } satisfies WorkerOutboundMessage)
              return
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          ;(self as typeof globalThis).postMessage({ type: 'error', error: 'aborted' } satisfies WorkerOutboundMessage)
        } else {
          ;(self as typeof globalThis).postMessage({
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream failed',
          } satisfies WorkerOutboundMessage)
        }
      }
    }
  }
}
