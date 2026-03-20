/**
 * @jest-environment node
 */
jest.mock('@/lib/services/openrouter.service')
jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))
jest.mock('@/lib/db/models/model', () => ({
  ModelModel: {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: '123', openRouterModelId: 'openai/gpt-4o' }),
    }),
  },
}))

import { POST } from '@/app/api/playground/chat/route'
import { streamChatCompletion } from '@/lib/services/openrouter.service'
import { ModelModel } from '@/lib/db/models/model'

const mockedStream = streamChatCompletion as jest.MockedFunction<typeof streamChatCompletion>

function makeValidBody(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: '507f1f77bcf86cd799439011',
    modelId: '507f1f77bcf86cd799439011',
    openRouterModelId: 'openai/gpt-4o',
    messages: [{ role: 'user', content: 'hello' }],
    parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0, reasoningEffort: 'low' },
    ...overrides,
  }
}

describe('POST /api/playground/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ModelModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: '123', openRouterModelId: 'openai/gpt-4o' }),
    })
  })

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
    const body = await response.json()
    expect(body.error).toContain('Validation error')
  })

  it('should return 400 if messages array is empty', async () => {
    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify(makeValidBody({ messages: [] })),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 for unknown model', async () => {
    ;(ModelModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    })

    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify(makeValidBody()),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Unknown model')
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
      body: JSON.stringify(makeValidBody()),
    })

    const response = await POST(request)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('should return 400 for invalid temperature', async () => {
    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify(makeValidBody({ parameters: { temperature: 3, maxTokens: 4096, topP: 1.0 } })),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should not drop content when usage arrives in same chunk', async () => {
    const mockBody = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"final"}}],"usage":{"prompt_tokens":10,"completion_tokens":5}}\n\n',
          ),
        )
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    mockedStream.mockResolvedValueOnce(
      new Response(mockBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    )

    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify(makeValidBody()),
    })

    const response = await POST(request)
    const text = await response.text()
    const events = text
      .split('\n\n')
      .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
      .map((l) => JSON.parse(l.slice(6)))

    const tokenEvent = events.find((e: any) => e.type === 'token')
    const doneEvent = events.find((e: any) => e.type === 'done')
    expect(tokenEvent).toBeDefined()
    expect(tokenEvent.content).toBe('final')
    expect(doneEvent).toBeDefined()
    expect(doneEvent.usage.promptTokens).toBe(10)
  })

  it('should flush buffer when reader signals done', async () => {
    const mockBody = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"buffered"}}]}',
          ),
        )
        controller.close()
      },
    })
    mockedStream.mockResolvedValueOnce(
      new Response(mockBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    )

    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify(makeValidBody()),
    })

    const response = await POST(request)
    const text = await response.text()
    const events = text
      .split('\n\n')
      .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
      .map((l) => JSON.parse(l.slice(6)))

    expect(events.some((e: any) => e.type === 'token' && e.content === 'buffered')).toBe(true)
  })

  it('should include reasoningTokens in done event', async () => {
    const mockBody = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        controller.enqueue(enc.encode('data: {"choices":[{"delta":{"reasoning":"think1"}}]}\n\n'))
        controller.enqueue(enc.encode('data: {"choices":[{"delta":{"reasoning":"think2"}}]}\n\n'))
        controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"answer"}}]}\n\n'))
        controller.enqueue(
          enc.encode(
            'data: {"choices":[],"usage":{"prompt_tokens":50,"completion_tokens":30}}\n\n',
          ),
        )
        controller.enqueue(enc.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    mockedStream.mockResolvedValueOnce(
      new Response(mockBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    )

    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify(makeValidBody()),
    })

    const response = await POST(request)
    const text = await response.text()
    const events = text
      .split('\n\n')
      .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
      .map((l) => JSON.parse(l.slice(6)))

    const doneEvent = events.find((e: any) => e.type === 'done')
    expect(doneEvent).toBeDefined()
    expect(doneEvent.usage.reasoningTokens).toBe(2)
    expect(doneEvent.usage.completionTokens).toBe(30)
  })
})
