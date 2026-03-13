/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

const mockCreate = jest.fn()
const mockFind = jest.fn()
const mockFindById = jest.fn()
const mockFindByIdAndUpdate = jest.fn()

jest.mock('@/lib/db/models/evaluation-session', () => ({
  EvaluationSessionModel: {
    create: (...args: unknown[]) => mockCreate(...args),
    find: (...args: unknown[]) => mockFind(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}))

import {
  createEvaluationSession,
  getEvaluationSessions,
  getEvaluationSessionById,
  updateSessionStatus,
  updateExperimentResult,
  getEvaluationProgress,
} from '@/lib/services/evaluation.service'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createEvaluationSession', () => {
  it('creates a session with pending status', async () => {
    const mockDoc = {
      _id: 'session-123',
      name: 'Test Eval',
      status: 'pending',
      toJSON: () => ({
        _id: 'session-123',
        name: 'Test Eval',
        status: 'pending',
      }),
    }
    mockCreate.mockResolvedValueOnce(mockDoc)

    const session = await createEvaluationSession({
      name: 'Test Eval',
      config: {
        models: [{
          modelId: '507f1f77bcf86cd799439011',
          slug: 'gpt-4o',
          openRouterModelId: 'openai/gpt-4o',
          modelName: 'GPT-4o',
          provider: 'OpenAI',
          parameters: { temperature: 0, maxTokens: 1024 },
        }],
        evaluators: ['correctness'],
      },
      dataset: {
        fileName: 'test.xlsx',
        rowCount: 10,
        columns: ['question', 'ground_truth'],
      },
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Eval',
        status: 'pending',
      }),
    )
    expect(session._id).toBe('session-123')
  })
})

describe('getEvaluationSessions', () => {
  it('returns sessions sorted by createdAt desc', async () => {
    const mockSessions = [
      { _id: '1', name: 'Session 1', status: 'completed' },
      { _id: '2', name: 'Session 2', status: 'pending' },
    ]
    mockFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockSessions),
        }),
      }),
    })

    const sessions = await getEvaluationSessions()

    expect(Array.isArray(sessions)).toBe(true)
    expect(sessions).toHaveLength(2)
    expect(mockFind).toHaveBeenCalled()
  })
})

describe('getEvaluationSessionById', () => {
  it('returns null for unknown id', async () => {
    mockFindById.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(null),
    })

    const session = await getEvaluationSessionById('unknown')
    expect(session).toBeNull()
  })

  it('returns session when found', async () => {
    const mockSession = { _id: 'session-1', name: 'Test', status: 'completed' }
    mockFindById.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(mockSession),
    })

    const session = await getEvaluationSessionById('session-1')
    expect(session).not.toBeNull()
    expect(session!._id).toBe('session-1')
  })
})

describe('updateSessionStatus', () => {
  it('updates session status', async () => {
    mockFindByIdAndUpdate.mockResolvedValueOnce({})

    await updateSessionStatus('session-1', 'running')

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ status: 'running' }),
    )
  })

  it('sets startedAt when status is running', async () => {
    mockFindByIdAndUpdate.mockResolvedValueOnce({})

    await updateSessionStatus('session-1', 'running')

    const updateArg = mockFindByIdAndUpdate.mock.calls[0][1]
    expect(updateArg.startedAt).toBeDefined()
  })

  it('sets completedAt when status is completed', async () => {
    mockFindByIdAndUpdate.mockResolvedValueOnce({})

    await updateSessionStatus('session-1', 'completed')

    const updateArg = mockFindByIdAndUpdate.mock.calls[0][1]
    expect(updateArg.completedAt).toBeDefined()
  })
})

describe('updateExperimentResult', () => {
  it('updates experiment result for model', async () => {
    mockFindByIdAndUpdate.mockResolvedValueOnce({})

    await updateExperimentResult('session-1', 'gpt-4o', {
      status: 'completed',
      phoenixExperimentId: 'exp-1',
      scores: { correctness: 0.95 },
      results: [],
      metrics: {
        avgLatencyMs: 500,
        totalTokens: { input: 100, output: 50 },
        estimatedCost: 0.01,
      },
    })

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        $set: expect.objectContaining({
          'experiments.$[elem].status': 'completed',
        }),
      }),
      expect.objectContaining({
        arrayFilters: [{ 'elem.modelSlug': 'gpt-4o' }],
      }),
    )
  })
})

describe('getEvaluationProgress', () => {
  it('returns progress for a session', async () => {
    const mockSession = {
      _id: 'session-1',
      status: 'running',
      config: { models: [{ slug: 'gpt-4o' }] },
      experiments: [
        { modelSlug: 'gpt-4o', status: 'completed', results: [{ rowIndex: 0 }] },
      ],
      dataset: { rowCount: 5 },
    }
    mockFindById.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(mockSession),
    })

    const progress = await getEvaluationProgress('session-1')

    expect(progress).not.toBeNull()
    expect(progress!.status).toBe('running')
    expect(progress!.experiments).toHaveLength(1)
    expect(progress!.progress.total).toBeGreaterThan(0)
  })

  it('returns null for unknown session', async () => {
    mockFindById.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(null),
    })

    const progress = await getEvaluationProgress('unknown')
    expect(progress).toBeNull()
  })
})
