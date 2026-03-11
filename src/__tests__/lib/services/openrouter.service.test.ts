/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

describe('OpenRouterService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('should export streamChatCompletion function', async () => {
    const { streamChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )
    expect(typeof streamChatCompletion).toBe('function')
  })

  it('should throw if OPENROUTER_API_KEY is not set', async () => {
    delete process.env.OPENROUTER_API_KEY
    const { streamChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await expect(
      streamChatCompletion({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
        parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
      }),
    ).rejects.toThrow('OPENROUTER_API_KEY')
  })

  it('should call OpenRouter API with correct params', async () => {
    const mockResponse = new Response('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
    mockFetch.mockResolvedValueOnce(mockResponse)

    const { streamChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await streamChatCompletion({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
      parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    )
  })

  it('should throw on non-ok response', async () => {
    const mockResponse = new Response('Unauthorized', { status: 401 })
    mockFetch.mockResolvedValueOnce(mockResponse)

    const { streamChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await expect(
      streamChatCompletion({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
        parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
      }),
    ).rejects.toThrow('OpenRouter API error')
  })
})
