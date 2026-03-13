/**
 * @jest-environment node
 */
jest.mock('@/lib/services/evaluation.service', () => ({
  getEvaluationSessions: jest.fn().mockResolvedValue([]),
  getEvaluationSessionById: jest.fn().mockResolvedValue(null),
  getEvaluationProgress: jest.fn().mockResolvedValue(null),
}))

import { GET as listSessions } from '@/app/api/evaluation/sessions/route'
import { GET as getSession } from '@/app/api/evaluation/sessions/[id]/route'
import { GET as getStatus } from '@/app/api/evaluation/sessions/[id]/status/route'
import {
  getEvaluationSessions,
  getEvaluationSessionById,
  getEvaluationProgress,
} from '@/lib/services/evaluation.service'

describe('GET /api/evaluation/sessions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns session list', async () => {
    const mockData = [
      { _id: '1', name: 'Eval 1', status: 'completed', modelCount: 2 },
    ]
    ;(getEvaluationSessions as jest.Mock).mockResolvedValueOnce(mockData)

    const response = await listSessions()
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual(mockData)
  })

  it('returns 500 on error', async () => {
    ;(getEvaluationSessions as jest.Mock).mockRejectedValueOnce(new Error('DB error'))

    const response = await listSessions()
    const body = await response.json()

    expect(body.success).toBe(false)
    expect(response.status).toBe(500)
  })
})

describe('GET /api/evaluation/sessions/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns session when found', async () => {
    const mockSession = { _id: '507f1f77bcf86cd799439011', name: 'Test', status: 'completed' }
    ;(getEvaluationSessionById as jest.Mock).mockResolvedValueOnce(mockSession)

    const response = await getSession(
      new Request('http://localhost/api/evaluation/sessions/507f1f77bcf86cd799439011'),
      { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) },
    )
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data._id).toBe('507f1f77bcf86cd799439011')
  })

  it('returns 404 when not found', async () => {
    ;(getEvaluationSessionById as jest.Mock).mockResolvedValueOnce(null)

    const response = await getSession(
      new Request('http://localhost/api/evaluation/sessions/507f1f77bcf86cd799439011'),
      { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) },
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
  })

  it('returns 400 for invalid ObjectId', async () => {
    const response = await getSession(
      new Request('http://localhost/api/evaluation/sessions/invalid'),
      { params: Promise.resolve({ id: 'invalid' }) },
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toContain('Invalid')
  })
})

describe('GET /api/evaluation/sessions/[id]/status', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns progress for session', async () => {
    const mockProgress = {
      status: 'running',
      progress: { completed: 3, total: 10 },
      experiments: [{ modelSlug: 'gpt-4o', status: 'running' }],
    }
    ;(getEvaluationProgress as jest.Mock).mockResolvedValueOnce(mockProgress)

    const response = await getStatus(
      new Request('http://localhost/api/evaluation/sessions/507f1f77bcf86cd799439011/status'),
      { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) },
    )
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('running')
    expect(body.data.progress.completed).toBe(3)
  })

  it('returns 404 when session not found', async () => {
    ;(getEvaluationProgress as jest.Mock).mockResolvedValueOnce(null)

    const response = await getStatus(
      new Request('http://localhost/api/evaluation/sessions/507f1f77bcf86cd799439011/status'),
      { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) },
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
  })

  it('returns 400 for invalid ObjectId', async () => {
    const response = await getStatus(
      new Request('http://localhost/api/evaluation/sessions/bad-id/status'),
      { params: Promise.resolve({ id: 'bad-id' }) },
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })
})
