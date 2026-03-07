/**
 * @jest-environment node
 */
const mockFind = jest.fn()
const mockFindOne = jest.fn()
const mockSort = jest.fn()
const mockSkip = jest.fn()
const mockLimit = jest.fn()
const mockLean = jest.fn()
const mockCountDocuments = jest.fn()

jest.mock('@/lib/db/models/model', () => ({
  ModelModel: {
    find: (...args: any[]) => {
      mockFind(...args)
      return { sort: mockSort }
    },
    findOne: (...args: any[]) => {
      mockFindOne(...args)
      return { lean: mockLean }
    },
    countDocuments: (...args: any[]) => mockCountDocuments(...args),
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

import { getModels, getModelBySlug } from '@/lib/services/model.service'

describe('Model Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSort.mockReturnValue({ skip: mockSkip })
    mockSkip.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ lean: mockLean })
    mockLean.mockResolvedValue([])
    mockCountDocuments.mockResolvedValue(0)
  })

  describe('getModels', () => {
    it('should call find with empty filter by default', async () => {
      await getModels({})
      expect(mockFind).toHaveBeenCalled()
    })

    it('should apply type filter', async () => {
      await getModels({ type: 'commercial' })
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'commercial' })
      )
    })

    it('should apply provider filter with multiple values', async () => {
      await getModels({ provider: 'OpenAI,Anthropic' })
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ provider: { $in: ['OpenAI', 'Anthropic'] } })
      )
    })

    it('should apply price range filter', async () => {
      await getModels({ minPrice: 1, maxPrice: 10 })
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          'pricing.output': { $gte: 1, $lte: 10 },
        })
      )
    })
  })

  describe('getModelBySlug', () => {
    it('should call findOne with slug', async () => {
      mockLean.mockResolvedValue({ slug: 'test-model' })
      await getModelBySlug('test-model')
      expect(mockFindOne).toHaveBeenCalledWith({ slug: 'test-model' })
    })

    it('should return null for non-existent slug', async () => {
      mockLean.mockResolvedValue(null)
      const result = await getModelBySlug('non-existent')
      expect(result).toBeNull()
    })
  })
})
