import { encodeCompareParams, decodeCompareParams, encodeFilterParams } from '@/lib/utils/url'

describe('URL utils', () => {
  describe('encodeCompareParams', () => {
    it('should encode model slugs as comma-separated', () => {
      const result = encodeCompareParams(['model-a', 'model-b'])
      expect(result).toBe('model-a,model-b')
    })
    it('should return empty string for empty array', () => {
      expect(encodeCompareParams([])).toBe('')
    })
  })

  describe('decodeCompareParams', () => {
    it('should decode comma-separated slugs to array', () => {
      const result = decodeCompareParams('model-a,model-b')
      expect(result).toEqual(['model-a', 'model-b'])
    })
    it('should return empty array for empty string', () => {
      expect(decodeCompareParams('')).toEqual([])
    })
  })
})
