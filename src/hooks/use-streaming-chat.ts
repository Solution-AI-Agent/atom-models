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
  readonly reasoning: string
  readonly metrics: IPlaygroundMessageMetrics | null
  readonly error: string | null
}

interface UseStreamingChatOptions {
  readonly modelId: string
  readonly openRouterModelId: string
  readonly parameters: IPlaygroundParameters
  readonly pricing: { readonly inputPer1m: number | null; readonly outputPer1m: number | null }
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    reasoning: '',
    metrics: null,
    error: null,
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (
      messages: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[],
    ): Promise<IPlaygroundMessage | null> => {
      setState({ isStreaming: true, content: '', reasoning: '', metrics: null, error: null })
      abortControllerRef.current = new AbortController()

      const startTime = performance.now()
      let firstTokenTime: number | null = null
      let tokenCount = 0
      let fullContent = ''
      let fullReasoning = ''
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
          try {
            const errorJson = JSON.parse(await res.text())
            setState((prev) => ({ ...prev, isStreaming: false, error: errorJson.error || 'Request failed' }))
          } catch {
            setState((prev) => ({ ...prev, isStreaming: false, error: 'Request failed' }))
          }
          return null
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break

            try {
              const event = JSON.parse(data)

              if (event.type === 'reasoning' && event.content) {
                if (firstTokenTime === null) {
                  firstTokenTime = performance.now()
                }
                tokenCount++
                fullReasoning += event.content
                setState((prev) => ({
                  ...prev,
                  reasoning: prev.reasoning + event.content,
                }))
              }

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
          (inputTokens * (options.pricing.inputPer1m ?? 0) +
            outputTokens * (options.pricing.outputPer1m ?? 0)) /
          1_000_000

        const metrics: IPlaygroundMessageMetrics = {
          ttft: Math.round(ttft),
          totalTime: Math.round(totalTime),
          tps: Math.round(tps * 10) / 10,
          inputTokens,
          outputTokens,
          estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000,
        }

        // If reasoning exists but content is empty (model timeout during reasoning phase),
        // fall back to showing reasoning as the content so the user sees something useful.
        const finalContent = fullContent || (fullReasoning ? `[리즈닝만 생성됨]\n\n${fullReasoning}` : '')

        // Do NOT clear state here — the parent calls reset() after adding the result
        // to the messages array. This ensures both state updates are batched by React
        // in a single render, preventing the flash/duplicate where streaming content
        // and the final message are both visible.

        return {
          role: 'assistant' as const,
          content: finalContent,
          reasoning: fullContent ? (fullReasoning || undefined) : undefined,
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

  const reset = useCallback(() => {
    setState({ isStreaming: false, content: '', reasoning: '', metrics: null, error: null })
  }, [])

  return { ...state, sendMessage, stop, reset }
}
