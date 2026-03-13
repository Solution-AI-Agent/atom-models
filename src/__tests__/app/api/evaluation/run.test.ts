/**
 * @jest-environment node
 */
jest.mock('@/lib/services/evaluation.service', () => ({
  createEvaluationSession: jest.fn().mockResolvedValue({
    _id: 'session-123',
    name: 'Test Eval',
    status: 'pending',
  }),
  updateSessionStatus: jest.fn().mockResolvedValue(undefined),
  updateExperimentResult: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/services/phoenix.service', () => ({
  checkPhoenixHealth: jest.fn().mockResolvedValue(true),
  createPhoenixDataset: jest.fn().mockResolvedValue({ datasetId: 'ds-123' }),
  buildEvaluators: jest.fn().mockResolvedValue([]),
  runPhoenixExperiment: jest.fn().mockResolvedValue({
    id: 'exp-1',
    runs: {},
    evaluationRuns: [],
  }),
}))
jest.mock('@/lib/services/openrouter.service', () => ({
  completeChatCompletion: jest.fn().mockResolvedValue({
    content: 'test response',
    usage: { promptTokens: 10, completionTokens: 5 },
  }),
}))

import { POST } from '@/app/api/evaluation/run/route'
import { checkPhoenixHealth } from '@/lib/services/phoenix.service'
import { createEvaluationSession } from '@/lib/services/evaluation.service'

let testCounter = 0

function makeValidBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Evaluation',
    rows: [
      { question: 'What is 1+1?', ground_truth: '2' },
    ],
    fileName: 'test.xlsx',
    columns: ['question', 'ground_truth'],
    models: [{
      modelId: '507f1f77bcf86cd799439011',
      slug: 'gpt-4o',
      openRouterModelId: 'openai/gpt-4o',
      modelName: 'GPT-4o',
      provider: 'OpenAI',
      parameters: { temperature: 0, maxTokens: 1024 },
    }],
    evaluators: ['correctness'],
    ...overrides,
  }
}

function makeRequest(body: unknown): Request {
  testCounter += 1
  return new Request('http://localhost/api/evaluation/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.0.0.${testCounter}`,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/evaluation/run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(checkPhoenixHealth as jest.Mock).mockResolvedValue(true)
  })

  it('returns sessionId for valid request', async () => {
    const request = makeRequest(makeValidBody())
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body.success).toBe(true)
    expect(body.data.sessionId).toBe('session-123')
  })

  it('rejects empty models array', async () => {
    const request = makeRequest(makeValidBody({ models: [] }))
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects more than 3 models', async () => {
    const models = Array.from({ length: 4 }, (_, i) => ({
      modelId: `id-${i}`,
      slug: `model-${i}`,
      openRouterModelId: `provider/model-${i}`,
      modelName: `Model ${i}`,
      provider: 'Provider',
      parameters: { temperature: 0, maxTokens: 1024 },
    }))
    const request = makeRequest(makeValidBody({ models }))
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects empty evaluators', async () => {
    const request = makeRequest(makeValidBody({ evaluators: [] }))
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects invalid evaluator names', async () => {
    const request = makeRequest(makeValidBody({ evaluators: ['invalid'] }))
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects when Phoenix is unhealthy', async () => {
    ;(checkPhoenixHealth as jest.Mock).mockResolvedValue(false)

    const request = makeRequest(makeValidBody())
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.success).toBe(false)
    expect(body.error).toContain('Phoenix')
  })

  it('rejects empty rows', async () => {
    const request = makeRequest(makeValidBody({ rows: [] }))
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('creates session with correct config', async () => {
    const validBody = makeValidBody()
    const request = makeRequest(validBody)
    await POST(request)

    expect(createEvaluationSession).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Evaluation',
        config: expect.objectContaining({
          models: validBody.models,
          evaluators: ['correctness'],
        }),
        dataset: expect.objectContaining({
          fileName: 'test.xlsx',
          rowCount: 1,
          columns: ['question', 'ground_truth'],
        }),
      }),
    )
  })
})
