import { QUANTIZATION_LEVELS } from '@/lib/constants/quantizations'

describe('QUANTIZATION_LEVELS', () => {
  it('should contain exactly 9 quantization levels', () => {
    expect(QUANTIZATION_LEVELS).toHaveLength(9)
  })

  it('should be ordered by precision priority (highest precision first)', () => {
    const expectedOrder = [
      'fp16', 'fp8', 'int8', 'int4',
      'q6_k', 'q5_k', 'q4_k_m', 'q3_k', 'q2_k',
    ]
    const actualOrder = QUANTIZATION_LEVELS.map((q) => q.key)
    expect(actualOrder).toEqual(expectedOrder)
  })

  it('should have required keys on every entry', () => {
    for (const level of QUANTIZATION_LEVELS) {
      expect(level).toHaveProperty('key')
      expect(level).toHaveProperty('label')
      expect(level).toHaveProperty('description')
      expect(level).toHaveProperty('group')
      expect(typeof level.key).toBe('string')
      expect(typeof level.label).toBe('string')
      expect(typeof level.description).toBe('string')
      expect(typeof level.group).toBe('string')
    }
  })

  it('should only use valid group values', () => {
    const validGroups = ['standard', 'gguf']
    for (const level of QUANTIZATION_LEVELS) {
      expect(validGroups).toContain(level.group)
    }
  })

  it('should have standard group for fp16, fp8, int8, int4', () => {
    const standardKeys = ['fp16', 'fp8', 'int8', 'int4']
    for (const key of standardKeys) {
      const level = QUANTIZATION_LEVELS.find((q) => q.key === key)
      expect(level).toBeDefined()
      expect(level!.group).toBe('standard')
    }
  })

  it('should have gguf group for q6_k, q5_k, q4_k_m, q3_k, q2_k', () => {
    const ggufKeys = ['q6_k', 'q5_k', 'q4_k_m', 'q3_k', 'q2_k']
    for (const key of ggufKeys) {
      const level = QUANTIZATION_LEVELS.find((q) => q.key === key)
      expect(level).toBeDefined()
      expect(level!.group).toBe('gguf')
    }
  })

  it('should have Korean descriptions for all entries', () => {
    for (const level of QUANTIZATION_LEVELS) {
      expect(level.description.length).toBeGreaterThan(0)
    }
  })

  it('should have unique keys', () => {
    const keys = QUANTIZATION_LEVELS.map((q) => q.key)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })
})
