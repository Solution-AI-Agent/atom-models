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

  describe('encodeFilterParams', () => {
    it('should encode filters as URLSearchParams', () => {
      const result = encodeFilterParams({ type: 'commercial', page: 1 })
      expect(result.get('type')).toBe('commercial')
      expect(result.get('page')).toBe('1')
    })

    it('should skip undefined values', () => {
      const result = encodeFilterParams({ type: 'open-source', provider: undefined })
      expect(result.get('type')).toBe('open-source')
      expect(result.has('provider')).toBe(false)
    })

    it('should skip empty string values', () => {
      const result = encodeFilterParams({ search: '' })
      expect(result.has('search')).toBe(false)
    })

    it('should return empty params for empty object', () => {
      const result = encodeFilterParams({})
      expect(result.toString()).toBe('')
    })
  })
})
