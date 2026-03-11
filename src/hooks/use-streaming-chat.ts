'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  IPlaygroundMessage,
  IPlaygroundMessageMetrics,
  IPlaygroundParameters,
} from '@/lib/types/playground'

interface StreamingState {
  readonly isStreaming: boolean
  readonly content: string
  readonly metrics: IPlaygroundMessageMetrics | null
  readonly error: string | null
}

interface UseStreamingChatOptions {
  readonly modelId: string
  readonly openRouterModelId: string
  readonly parameters: IPlaygroundParameters
  readonly pricing: { readonly input: number; readonly output: number }
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    metrics: null,
    error: null,
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (
      messages: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[],
    ): Promise<IPlaygroundMessage | null> => {
      setState({ isStreaming: true, content: '', metrics: null, error: null })
      abortControllerRef.current = new AbortController()

      const startTime = performance.now()
      let firstTokenTime: number | null = null
      let tokenCount = 0
      let fullContent = ''
      let usage: { promptTokens: number; completionTokens: number } | null = null

      try {
        const res = await fetch('/api/playground/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: '',
            modelId: options.modelId,
            openRouterModelId: options.openRouterModelId,
            messages,
            parameters: options.parameters,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!res.ok) {
          const errorText = await res.text()
          setState((prev) => ({ ...prev, isStreaming: false, error: errorText }))
          return null
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break

            try {
              const event = JSON.parse(data)

              if (event.type === 'token' && event.content) {
                if (firstTokenTime === null) {
                  firstTokenTime = performance.now()
                }
                tokenCount++
                fullContent += event.content
                setState((prev) => ({
                  ...prev,
                  content: prev.content + event.content,
                }))
              }

              if (event.type === 'done' && event.usage) {
                usage = event.usage
              }

              if (event.type === 'error') {
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  error: event.error,
                }))
                return null
              }
            } catch {
              // skip unparseable
            }
          }
        }

        const endTime = performance.now()
        const totalTime = endTime - startTime
        const ttft = firstTokenTime ? firstTokenTime - startTime : totalTime
        const tps = tokenCount > 0 ? tokenCount / (totalTime / 1000) : 0

        const inputTokens = usage?.promptTokens ?? 0
        const outputTokens = usage?.completionTokens ?? tokenCount
        const estimatedCost =
          (inputTokens * options.pricing.input +
            outputTokens * options.pricing.output) /
          1_000_000

        const metrics: IPlaygroundMessageMetrics = {
          ttft: Math.round(ttft),
          totalTime: Math.round(totalTime),
          tps: Math.round(tps * 10) / 10,
          inputTokens,
          outputTokens,
          estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000,
        }

        setState({ isStreaming: false, content: fullContent, metrics, error: null })

        return {
          role: 'assistant' as const,
          content: fullContent,
          modelId: options.modelId,
          metrics,
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setState((prev) => ({ ...prev, isStreaming: false }))
          return null
        }
        const message = error instanceof Error ? error.message : 'Stream failed'
        setState((prev) => ({ ...prev, isStreaming: false, error: message }))
        return null
      }
    },
    [options.modelId, options.openRouterModelId, options.parameters, options.pricing],
  )

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { ...state, sendMessage, stop }
}
