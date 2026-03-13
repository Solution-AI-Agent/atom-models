/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
  process.env.OPENROUTER_API_KEY = 'test-key'
})
afterEach(() => {
  delete process.env.OPENROUTER_API_KEY
})

describe('completeChatCompletion', () => {
  it('returns content and usage from successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Paris is the capital of France.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 8 },
      }),
    } as unknown as Response)

    const { completeChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    const result = await completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'What is the capital of France?' }],
    })

    expect(result.content).toBe('Paris is the capital of France.')
    expect(result.usage.promptTokens).toBe(10)
    expect(result.usage.completionTokens).toBe(8)
  })

  it('throws on missing API key', async () => {
    delete process.env.OPENROUTER_API_KEY

    const { completeChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await expect(
      completeChatCompletion({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
      }),
    ).rejects.toThrow('OPENROUTER_API_KEY')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    } as unknown as Response)

    const { completeChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await expect(
      completeChatCompletion({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
      }),
    ).rejects.toThrow('429')
  })

  it('sends correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 5, completion_tokens: 1 },
      }),
    } as unknown as Response)

    const { completeChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      temperature: 0,
      maxTokens: 512,
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1]!.body as string)
    expect(callBody.stream).toBe(false)
    expect(callBody.temperature).toBe(0)
    expect(callBody.max_tokens).toBe(512)
    expect(callBody.stream_options).toBeUndefined()
  })

  it('returns empty content when choices are missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [],
        usage: { prompt_tokens: 5, completion_tokens: 0 },
      }),
    } as unknown as Response)

    const { completeChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    const result = await completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
    })

    expect(result.content).toBe('')
  })

  it('uses default temperature and maxTokens when not specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 5, completion_tokens: 1 },
      }),
    } as unknown as Response)

    const { completeChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1]!.body as string)
    expect(callBody.temperature).toBe(0)
    expect(callBody.max_tokens).toBe(1024)
  })
})
