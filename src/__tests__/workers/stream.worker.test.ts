/**
 * @jest-environment node
 */
import { parseSSELine, calculateMetrics } from '@/workers/stream.worker'

describe('parseSSELine', () => {
  it('returns null for non-data lines', () => {
    expect(parseSSELine('')).toBeNull()
    expect(parseSSELine('event: ping')).toBeNull()
  })

  it('returns DONE for [DONE] line', () => {
    expect(parseSSELine('data: [DONE]')).toEqual({ done: true })
  })

  it('parses token event', () => {
    const result = parseSSELine('data: {"type":"token","content":"hi"}')
    expect(result).toEqual({ type: 'token', content: 'hi' })
  })

  it('parses reasoning event', () => {
    const result = parseSSELine('data: {"type":"reasoning","content":"think"}')
    expect(result).toEqual({ type: 'reasoning', content: 'think' })
  })

  it('parses done event with usage', () => {
    const result = parseSSELine(
      'data: {"type":"done","usage":{"promptTokens":10,"completionTokens":20,"reasoningTokens":5}}',
    )
    expect(result).toEqual({
      type: 'done',
      usage: { promptTokens: 10, completionTokens: 20, reasoningTokens: 5 },
    })
  })

  it('returns null for unparseable JSON', () => {
    expect(parseSSELine('data: {broken')).toBeNull()
  })
})

describe('calculateMetrics', () => {
  it('calculates content-only metrics', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 2000,
      contentFirstTokenTime: 100,
      contentLastTokenTime: 1900,
      contentChunkCount: 10,
      reasoningFirstTokenTime: null,
      reasoningLastTokenTime: null,
      reasoningChunkCount: 0,
      usage: { promptTokens: 50, completionTokens: 20 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.reasoningTtft).toBeNull()
    expect(result.reasoningTps).toBeNull()
    expect(result.reasoningTokens).toBe(0)
    expect(result.contentTtft).toBe(100)
    expect(result.contentTokens).toBe(20)
    expect(result.totalTime).toBe(2000)
    expect(result.inputTokens).toBe(50)
    expect(result.contentTps).toBeGreaterThan(0)
    expect(result.estimatedCost).toBeGreaterThan(0)
  })

  it('calculates reasoning+content metrics', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 5000,
      contentFirstTokenTime: 2000,
      contentLastTokenTime: 4500,
      contentChunkCount: 15,
      reasoningFirstTokenTime: 80,
      reasoningLastTokenTime: 1900,
      reasoningChunkCount: 30,
      usage: { promptTokens: 100, completionTokens: 60, reasoningTokens: 40 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.reasoningTtft).toBe(80)
    expect(result.reasoningTps).toBeGreaterThan(0)
    expect(result.reasoningTokens).toBe(40)
    expect(result.contentTtft).toBe(2000)
    expect(result.contentTokens).toBe(20) // 60 - 40
  })

  it('clamps contentTokens to 0 when reasoning exceeds completion', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 1000,
      contentFirstTokenTime: 500,
      contentLastTokenTime: 900,
      contentChunkCount: 5,
      reasoningFirstTokenTime: 50,
      reasoningLastTokenTime: 400,
      reasoningChunkCount: 20,
      usage: { promptTokens: 10, completionTokens: 15, reasoningTokens: 20 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.contentTokens).toBe(0)
  })

  it('falls back to chunk count when usage has no reasoningTokens', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 1000,
      contentFirstTokenTime: 500,
      contentLastTokenTime: 900,
      contentChunkCount: 5,
      reasoningFirstTokenTime: 50,
      reasoningLastTokenTime: 400,
      reasoningChunkCount: 8,
      usage: { promptTokens: 10, completionTokens: 30 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.reasoningTokens).toBe(8)
    expect(result.contentTokens).toBe(22) // 30 - 8
  })
})
