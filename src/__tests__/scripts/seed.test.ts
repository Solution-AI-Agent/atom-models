import { parseModelData, parsePresetData, parseGpuData } from '@/lib/utils/seed-helpers'

describe('Seed helpers', () => {
  it('should parse model data with date conversion', () => {
    const raw = {
      name: 'Test Model',
      slug: 'test-model',
      releaseDate: '2025-02-24',
      lastVerifiedAt: '2025-03-01',
    }
    const parsed = parseModelData(raw)
    expect(parsed.releaseDate).toBeInstanceOf(Date)
    expect(parsed.lastVerifiedAt).toBeInstanceOf(Date)
    expect(parsed.name).toBe('Test Model')
  })

  it('should default lastVerifiedAt to now if not provided', () => {
    const raw = { name: 'Test', releaseDate: '2025-01-01' }
    const parsed = parseModelData(raw)
    expect(parsed.releaseDate).toBeInstanceOf(Date)
    expect(parsed.lastVerifiedAt).toBeInstanceOf(Date)
  })

  it('should pass through preset data unchanged', () => {
    const raw = {
      category: 'Test Category',
      categorySlug: 'test-category',
      weights: { quality: 0.5, speed: 0.5 },
    }
    const parsed = parsePresetData(raw)
    expect(parsed.category).toBe('Test Category')
    expect(parsed.categorySlug).toBe('test-category')
  })

  it('should pass through GPU data unchanged', () => {
    const raw = {
      name: 'Test GPU',
      vendor: 'NVIDIA',
      vram: 80,
    }
    const parsed = parseGpuData(raw)
    expect(parsed.name).toBe('Test GPU')
    expect(parsed.vram).toBe(80)
  })

  it('should not mutate the original object', () => {
    const raw = { name: 'Test', releaseDate: '2025-01-01' }
    const parsed = parseModelData(raw)
    expect(raw.releaseDate).toBe('2025-01-01')
    expect(parsed.releaseDate).toBeInstanceOf(Date)
  })
})
