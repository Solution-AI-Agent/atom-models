import { formatPrice, formatNumber, formatDate, formatContextWindow } from '@/lib/utils/format'

describe('format utils', () => {
  describe('formatPrice', () => {
    it('should format price with $ prefix', () => {
      expect(formatPrice(3.0)).toBe('$3.00')
    })
    it('should format small prices', () => {
      expect(formatPrice(0.075)).toBe('$0.075')
    })
    it('should return "Free" for 0', () => {
      expect(formatPrice(0)).toBe('Free')
    })
  })

  describe('formatNumber', () => {
    it('should format large numbers with K suffix', () => {
      expect(formatNumber(128000)).toBe('128K')
    })
    it('should format millions with M suffix', () => {
      expect(formatNumber(1048576)).toBe('1.05M')
    })
    it('should format small numbers as-is', () => {
      expect(formatNumber(405)).toBe('405')
    })
  })

  describe('formatDate', () => {
    it('should format date string to YYYY.MM.DD', () => {
      expect(formatDate('2025-02-24')).toBe('2025.02.24')
    })
  })

  describe('formatContextWindow', () => {
    it('should format context window in K tokens', () => {
      expect(formatContextWindow(200000)).toBe('200K')
    })
    it('should format large context window in M tokens', () => {
      expect(formatContextWindow(1048576)).toBe('1.05M')
    })
  })
})
