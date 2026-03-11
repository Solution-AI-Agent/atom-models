/**
 * @jest-environment node
 */
const mockLean = jest.fn()
const mockSelect = jest.fn()
const mockSort = jest.fn()
const mockFind = jest.fn()
const mockFindById = jest.fn()
const mockCreate = jest.fn()
const mockFindByIdAndDelete = jest.fn()
const mockFindByIdAndUpdate = jest.fn()

jest.mock('@/lib/db/models/playground-session', () => ({
  PlaygroundSessionModel: {
    find: (...args: any[]) => {
      mockFind(...args)
      return { sort: mockSort }
    },
    findById: (...args: any[]) => {
      mockFindById(...args)
      return {
        lean: mockLean,
        select: (...sArgs: any[]) => {
          mockSelect(...sArgs)
          return { lean: mockLean }
        },
      }
    },
    create: (...args: any[]) => mockCreate(...args),
    findByIdAndDelete: (...args: any[]) => mockFindByIdAndDelete(...args),
    findByIdAndUpdate: (...args: any[]) => {
      mockFindByIdAndUpdate(...args)
      return { lean: mockLean }
    },
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

import {
  getSessions,
  getSessionById,
  createSession,
  deleteSession,
  addMessagesToSession,
} from '@/lib/services/playground.service'

describe('PlaygroundService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSort.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ lean: mockLean })
    mockLean.mockResolvedValue(null)
  })

  describe('getSessions', () => {
    it('returns session list', async () => {
      const mockSessions = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Test',
          models: [{ modelName: 'GPT-4', provider: 'OpenAI' }],
          messages: [{ role: 'user', content: 'hi' }],
          createdAt: new Date('2026-01-01'),
        },
      ]
      mockLean.mockResolvedValueOnce(mockSessions)

      const result = await getSessions()
      expect(result).toBeDefined()
      expect(result).toHaveLength(1)
      expect(result[0].messageCount).toBe(1)
      expect(mockFind).toHaveBeenCalled()
    })
  })

  describe('getSessionById', () => {
    it('returns session when found', async () => {
      const mockSession = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Test',
        models: [],
        messages: [],
        systemPrompt: '',
        defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
        createdAt: new Date(),
      }
      mockLean.mockResolvedValueOnce(mockSession)

      const result = await getSessionById('507f1f77bcf86cd799439011')
      expect(result).toBeDefined()
      expect(result?.title).toBe('Test')
    })

    it('returns null when not found', async () => {
      mockLean.mockResolvedValueOnce(null)
      const result = await getSessionById('507f1f77bcf86cd799439011')
      expect(result).toBeNull()
    })
  })

  describe('createSession', () => {
    it('creates and returns session', async () => {
      const input = {
        title: 'Test Session',
        models: [] as const,
        systemPrompt: 'You are helpful.',
        defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
      }
      const mockDoc = {
        ...input,
        _id: '507f1f77bcf86cd799439011',
        messages: [],
        toJSON: () => ({
          ...input,
          _id: '507f1f77bcf86cd799439011',
          messages: [],
          createdAt: new Date().toISOString(),
        }),
      }
      mockCreate.mockResolvedValueOnce(mockDoc)

      const result = await createSession(input)
      expect(result).toBeDefined()
      expect(mockCreate).toHaveBeenCalled()
    })
  })

  describe('deleteSession', () => {
    it('calls findByIdAndDelete', async () => {
      mockFindByIdAndDelete.mockResolvedValueOnce({ _id: '507f1f77bcf86cd799439011' })

      await deleteSession('507f1f77bcf86cd799439011')
      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
    })
  })

  describe('addMessagesToSession', () => {
    it('adds messages within limit', async () => {
      const existingMessages = Array.from({ length: 199 }, (_, i) => ({
        role: 'user',
        content: `msg ${i}`,
      }))

      // First findById call (for message count check)
      mockLean.mockResolvedValueOnce({ messages: existingMessages })

      const mockUpdated = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Test',
        models: [],
        messages: [...existingMessages, { role: 'user', content: 'new' }],
        systemPrompt: '',
        defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
      }
      // findByIdAndUpdate lean call
      mockLean.mockResolvedValueOnce(mockUpdated)

      const result = await addMessagesToSession('507f1f77bcf86cd799439011', [
        { role: 'user', content: 'new' },
      ])
      expect(result).toBeDefined()
    })

    it('rejects when message limit exceeded', async () => {
      const existingMessages = Array.from({ length: 200 }, (_, i) => ({
        role: 'user',
        content: `msg ${i}`,
      }))

      mockLean.mockResolvedValueOnce({ messages: existingMessages })

      await expect(
        addMessagesToSession('507f1f77bcf86cd799439011', [
          { role: 'user', content: 'over limit' },
        ]),
      ).rejects.toThrow('Session message limit exceeded')
    })

    it('returns null when session not found', async () => {
      mockLean.mockResolvedValueOnce(null)

      const result = await addMessagesToSession('507f1f77bcf86cd799439011', [
        { role: 'user', content: 'test' },
      ])
      expect(result).toBeNull()
    })
  })
})
