'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createStreamWorker } from '@/lib/utils/create-stream-worker'
import type { IPlaygroundMessage, IPlaygroundMessageMetrics, IPlaygroundParameters } from '@/lib/types/playground'

interface UseWorkerChatOptions {
  readonly modelId: string
  readonly openRouterModelId: string
  readonly parameters: IPlaygroundParameters
  readonly pricing: { readonly inputPer1m: number | null; readonly outputPer1m: number | null }
}

interface StreamingState {
  readonly isStreaming: boolean
  readonly content: string
  readonly reasoning: string
  readonly metrics: IPlaygroundMessageMetrics | null
  readonly error: string | null
}

export function useWorkerChat(options: UseWorkerChatOptions) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    reasoning: '',
    metrics: null,
    error: null,
  })

  const workerRef = useRef<Worker | null>(null)
  const resolveRef = useRef<((msg: IPlaygroundMessage | null) => void) | null>(null)
  const isStreamingRef = useRef(false)
  const modelIdRef = useRef(options.modelId)
  modelIdRef.current = options.modelId

  useEffect(() => {
    workerRef.current = createStreamWorker()

    workerRef.current.onmessage = (e: MessageEvent) => {
      const msg = e.data

      if (msg.type === 'token') {
        setState((prev) => ({ ...prev, content: prev.content + msg.content }))
      } else if (msg.type === 'reasoning') {
        setState((prev) => ({ ...prev, reasoning: prev.reasoning + msg.content }))
      } else if (msg.type === 'done') {
        const result: IPlaygroundMessage = {
          role: 'assistant',
          content: msg.content,
          reasoning: msg.reasoning || undefined,
          modelId: modelIdRef.current,
          metrics: msg.metrics,
        }
        isStreamingRef.current = false
        setState((prev) => ({ ...prev, isStreaming: false, metrics: msg.metrics }))
        resolveRef.current?.(result)
        resolveRef.current = null
      } else if (msg.type === 'error') {
        isStreamingRef.current = false
        if (msg.error === 'aborted') {
          setState((prev) => ({ ...prev, isStreaming: false }))
        } else {
          setState((prev) => ({ ...prev, isStreaming: false, error: msg.error }))
        }
        resolveRef.current?.(null)
        resolveRef.current = null
      }
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = useCallback(
    (
      messages: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[],
    ): Promise<IPlaygroundMessage | null> => {
      if (isStreamingRef.current) {
        return Promise.resolve(null)
      }

      isStreamingRef.current = true
      setState({ isStreaming: true, content: '', reasoning: '', metrics: null, error: null })

      workerRef.current?.postMessage({
        type: 'start',
        apiBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
        modelId: options.modelId,
        openRouterModelId: options.openRouterModelId,
        messages,
        parameters: options.parameters,
        pricing: options.pricing,
      })

      return new Promise<IPlaygroundMessage | null>((resolve) => {
        resolveRef.current = resolve
      })
    },
    [options.modelId, options.openRouterModelId, options.parameters, options.pricing],
  )

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ type: 'abort' })
  }, [])

  const reset = useCallback(() => {
    setState({ isStreaming: false, content: '', reasoning: '', metrics: null, error: null })
  }, [])

  return { ...state, sendMessage, stop, reset }
}
