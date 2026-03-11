/**
 * @jest-environment node
 */
const mockFind = jest.fn()
const mockLean = jest.fn()

jest.mock('@/lib/db/models/bva-preset', () => ({
  BvaPresetModel: {
    find: (...args: any[]) => {
      mockFind(...args)
      return { lean: mockLean }
    },
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

import { getAllPresets, getPresetsByCategory, getPresetCategories } from '@/lib/services/preset.service'

describe('Preset Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllPresets', () => {
    it('should return all presets', async () => {
      const presets = [{ category: 'CS', categorySlug: 'cs' }]
      mockLean.mockResolvedValue(presets)

      const result = await getAllPresets()
      expect(result).toEqual(presets)
      expect(mockFind).toHaveBeenCalledWith()
    })
  })

  describe('getPresetsByCategory', () => {
    it('should filter by categorySlug', async () => {
      const presets = [{ categorySlug: 'development' }]
      mockLean.mockResolvedValue(presets)

      const result = await getPresetsByCategory('development')
      expect(result).toEqual(presets)
      expect(mockFind).toHaveBeenCalledWith({ categorySlug: 'development' })
    })
  })

  describe('getPresetCategories', () => {
    it('should aggregate presets into categories with counts', async () => {
      mockLean.mockResolvedValue([
        { category: 'CS', categorySlug: 'customer-service' },
        { category: 'CS', categorySlug: 'customer-service' },
        { category: 'Dev', categorySlug: 'development' },
      ])

      const result = await getPresetCategories()
      expect(result).toHaveLength(2)
      expect(result).toContainEqual({ category: 'CS', categorySlug: 'customer-service', count: 2 })
      expect(result).toContainEqual({ category: 'Dev', categorySlug: 'development', count: 1 })
    })

    it('should return empty array when no presets', async () => {
      mockLean.mockResolvedValue([])
      const result = await getPresetCategories()
      expect(result).toEqual([])
    })
  })
})
