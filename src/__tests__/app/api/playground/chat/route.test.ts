/**
 * @jest-environment node
 */
jest.mock('@/lib/services/openrouter.service')

import { POST } from '@/app/api/playground/chat/route'
import { streamChatCompletion } from '@/lib/services/openrouter.service'

const mockedStream = streamChatCompletion as jest.MockedFunction<typeof streamChatCompletion>

describe('POST /api/playground/chat', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should export POST handler', () => {
    expect(typeof POST).toBe('function')
  })

  it('should return 400 if required fields missing', async () => {
    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 if messages array is empty', async () => {
    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify({
        openRouterModelId: 'openai/gpt-4o',
        messages: [],
        parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should proxy SSE stream from OpenRouter', async () => {
    const mockBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'))
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    const mockResponse = new Response(mockBody, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
    mockedStream.mockResolvedValueOnce(mockResponse)

    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify({
        openRouterModelId: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
        parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
      }),
    })

    const response = await POST(request)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })
})
