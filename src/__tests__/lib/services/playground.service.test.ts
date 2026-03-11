/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { MockedFunction } from 'jest-mock'

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

const mockFind = jest.fn()
const mockFindById = jest.fn()
const mockCreate = jest.fn()
const mockFindByIdAndDelete = jest.fn()
const mockFindByIdAndUpdate = jest.fn()
const mockCountDocuments = jest.fn()
const mockSort = jest.fn().mockReturnThis()
const mockSelect = jest.fn().mockReturnThis()
const mockLean = jest.fn()

jest.mock('@/lib/db/models/playground-session', () => ({
  PlaygroundSessionModel: {
    find: mockFind.mockReturnValue({ sort: mockSort }),
    findById: mockFindById.mockReturnValue({ lean: mockLean }),
    create: mockCreate,
    findByIdAndDelete: mockFindByIdAndDelete,
    findByIdAndUpdate: mockFindByIdAndUpdate.mockReturnValue({ lean: jest.fn() }),
    countDocuments: mockCountDocuments,
  },
}))

describe('PlaygroundService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSort.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ lean: mockLean })
  })

  it('getSessions returns session list', async () => {
    const mockSessions = [
      { _id: '1', title: 'Test', models: [], messages: [], createdAt: new Date() },
    ]
    mockLean.mockResolvedValueOnce(mockSessions)

    const { getSessions } = await import('@/lib/services/playground.service')
    const result = await getSessions()
    expect(result).toBeDefined()
    expect(mockFind).toHaveBeenCalled()
  })

  it('createSession creates and returns session', async () => {
    const input = {
      title: 'Test Session',
      models: [],
      systemPrompt: 'You are helpful.',
      defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
    }
    const mockDoc = { ...input, _id: '123', messages: [], toJSON: () => ({ ...input, _id: '123' }) }
    mockCreate.mockResolvedValueOnce(mockDoc)

    const { createSession } = await import('@/lib/services/playground.service')
    const result = await createSession(input)
    expect(result).toBeDefined()
    expect(mockCreate).toHaveBeenCalled()
  })

  it('deleteSession calls findByIdAndDelete', async () => {
    mockFindByIdAndDelete.mockResolvedValueOnce({ _id: '123' })

    const { deleteSession } = await import('@/lib/services/playground.service')
    await deleteSession('123')
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith('123')
  })
})
