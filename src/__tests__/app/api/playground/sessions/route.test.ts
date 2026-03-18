/**
 * @jest-environment node
 */
jest.mock('@/lib/services/playground.service')

import { GET, POST } from '@/app/api/playground/sessions/route'
import { getSessions, createSession } from '@/lib/services/playground.service'

const mockedGetSessions = getSessions as jest.MockedFunction<typeof getSessions>
const mockedCreateSession = createSession as jest.MockedFunction<typeof createSession>

describe('GET /api/playground/sessions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns session list', async () => {
    const mockData = [{ _id: '1', title: 'Test', models: [], messageCount: 0, createdAt: '2026-03-11' }]
    mockedGetSessions.mockResolvedValueOnce(mockData as any)

    const response = await GET()
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual(mockData)
  })

  it('returns 500 on error', async () => {
    mockedGetSessions.mockRejectedValueOnce(new Error('DB error'))

    const response = await GET()
    const body = await response.json()

    expect(body.success).toBe(false)
    expect(response.status).toBe(500)
  })
})

describe('POST /api/playground/sessions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a new session', async () => {
    const input = {
      title: 'New Session',
      models: [{
        modelId: '507f1f77bcf86cd799439011',
        modelName: 'GPT-4o',
        provider: 'OpenAI',
        openRouterModelId: 'openai/gpt-4o',
      }],
      systemPrompt: '',
      defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0, reasoningEffort: 'low' },
    }
    const mockResult = { ...input, _id: '123', messages: [] }
    mockedCreateSession.mockResolvedValueOnce(mockResult as any)

    const request = new Request('http://localhost/api/playground/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const response = await POST(request)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data._id).toBe('123')
    expect(response.status).toBe(201)
  })

  it('returns 400 for invalid body', async () => {
    const request = new Request('http://localhost/api/playground/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toContain('Validation error')
  })

  it('returns 400 when models array is empty', async () => {
    const request = new Request('http://localhost/api/playground/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        models: [],
        defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0, reasoningEffort: 'low' },
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 when title exceeds max length', async () => {
    const request = new Request('http://localhost/api/playground/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'x'.repeat(201),
        models: [{
          modelId: '507f1f77bcf86cd799439011',
          modelName: 'GPT-4o',
          provider: 'OpenAI',
          openRouterModelId: 'openai/gpt-4o',
        }],
        defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0, reasoningEffort: 'low' },
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
