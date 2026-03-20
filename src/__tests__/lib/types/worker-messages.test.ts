/**
 * @jest-environment node
 */
import {
  isWorkerTokenMessage,
  isWorkerReasoningMessage,
  isWorkerDoneMessage,
  isWorkerErrorMessage,
} from '@/lib/types/worker-messages'

describe('Worker message type guards', () => {
  it('identifies token message', () => {
    expect(isWorkerTokenMessage({ type: 'token', content: 'hi' } as any)).toBe(true)
    expect(isWorkerTokenMessage({ type: 'reasoning', content: 'hi' } as any)).toBe(false)
  })

  it('identifies reasoning message', () => {
    expect(isWorkerReasoningMessage({ type: 'reasoning', content: 'think' } as any)).toBe(true)
  })

  it('identifies done message', () => {
    const msg = {
      type: 'done',
      content: 'result',
      reasoning: '',
      metrics: {
        reasoningTtft: null,
        reasoningTps: null,
        reasoningTokens: 0,
        contentTtft: 100,
        contentTps: 50,
        contentTokens: 20,
        totalTime: 1000,
        inputTokens: 10,
        estimatedCost: 0.001,
      },
    }
    expect(isWorkerDoneMessage(msg as any)).toBe(true)
  })

  it('identifies error message', () => {
    expect(isWorkerErrorMessage({ type: 'error', error: 'fail' } as any)).toBe(true)
  })
})
