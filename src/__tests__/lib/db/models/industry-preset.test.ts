/**
 * @jest-environment node
 */
import { IndustryPresetSchema } from '@/lib/db/models/industry-preset'

describe('IndustryPreset Schema', () => {
  it('should have required fields', () => {
    const requiredPaths = ['category', 'categorySlug', 'taskType', 'taskTypeSlug']
    for (const path of requiredPaths) {
      expect(IndustryPresetSchema.path(path)).toBeDefined()
      expect(IndustryPresetSchema.path(path).isRequired).toBeTruthy()
    }
  })

  it('should have weights with default values', () => {
    const qualityPath = IndustryPresetSchema.path('weights.quality') as any
    expect(qualityPath.defaultValue).toBe(0)
  })
})
