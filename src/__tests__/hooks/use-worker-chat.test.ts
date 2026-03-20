/**
 * @jest-environment jsdom
 */

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage = jest.fn()
  terminate = jest.fn()
}

let mockWorkerInstance: MockWorker

jest.mock('@/lib/utils/create-stream-worker', () => ({
  createStreamWorker: () => {
    mockWorkerInstance = new MockWorker()
    return mockWorkerInstance
  },
}))

import { renderHook, act } from '@testing-library/react'
import { useWorkerChat } from '@/hooks/use-worker-chat'

const defaultOptions = {
  modelId: 'test-model',
  openRouterModelId: 'openai/gpt-4o',
  parameters: { temperature: 0.7, maxTokens: 4096, topP: 1, reasoningEffort: 'low' as const },
  pricing: { inputPer1m: 5, outputPer1m: 15 },
}

describe('useWorkerChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.content).toBe('')
    expect(result.current.reasoning).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('sends start message to worker on sendMessage', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'start', modelId: 'test-model' }),
    )
    expect(result.current.isStreaming).toBe(true)
  })

  it('accumulates content from token messages', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })

    act(() => {
      mockWorkerInstance.onmessage?.({ data: { type: 'token', content: 'hi ' } } as MessageEvent)
    })
    act(() => {
      mockWorkerInstance.onmessage?.({ data: { type: 'token', content: 'there' } } as MessageEvent)
    })

    expect(result.current.content).toBe('hi there')
  })

  it('resolves promise with result on done', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    let promise: Promise<any>
    act(() => {
      promise = result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })

    const doneMsg = {
      type: 'done',
      content: 'response',
      reasoning: '',
      metrics: {
        reasoningTtft: null, reasoningTps: null, reasoningTokens: 0,
        contentTtft: 100, contentTps: 50, contentTokens: 20,
        totalTime: 1000, inputTokens: 10, estimatedCost: 0.001,
      },
    }

    act(() => {
      mockWorkerInstance.onmessage?.({ data: doneMsg } as MessageEvent)
    })

    const resultMsg = await promise!
    expect(resultMsg).not.toBeNull()
    expect(resultMsg.content).toBe('response')
    expect(resultMsg.metrics.contentTtft).toBe(100)
  })

  it('sends abort on stop', () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })
    act(() => {
      result.current.stop()
    })

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'abort' })
  })

  it('does not show error UI for aborted', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })
    act(() => {
      mockWorkerInstance.onmessage?.({ data: { type: 'error', error: 'aborted' } } as MessageEvent)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.isStreaming).toBe(false)
  })
})
