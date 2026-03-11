import * as fs from 'fs'
import * as path from 'path'
import { parseModelData, parsePresetData, parseGpuData } from '@/lib/utils/seed-helpers'

describe('Seed data - models.json VRAM fields', () => {
  const modelsPath = path.resolve(process.cwd(), 'data/models.json')
  const models: any[] = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'))

  const ossModelsWithInfra = models.filter(
    (m) => m.type === 'open-source' && m.infrastructure !== null
  )

  it('should have OSS models with infrastructure', () => {
    expect(ossModelsWithInfra.length).toBeGreaterThan(0)
  })

  it('should have vramFp8 field on all OSS models with infrastructure', () => {
    for (const model of ossModelsWithInfra) {
      expect(model.infrastructure.vramFp8).toBeDefined()
      expect(typeof model.infrastructure.vramFp8).toBe('number')
      expect(model.infrastructure.vramFp8).toBeGreaterThan(0)
    }
  })

  it('should have optional quantization VRAM fields as numbers when present', () => {
    const quantFields = ['vramQ6k', 'vramQ5k', 'vramQ4kM', 'vramQ3k', 'vramQ2k'] as const
    for (const model of ossModelsWithInfra) {
      for (const field of quantFields) {
        if (model.infrastructure[field] !== undefined) {
          expect(typeof model.infrastructure[field]).toBe('number')
          expect(model.infrastructure[field]).toBeGreaterThan(0)
        }
      }
    }
  })

  it('should maintain VRAM ordering: fp16 >= fp8 >= int8 >= int4', () => {
    for (const model of ossModelsWithInfra) {
      const infra = model.infrastructure
      expect(infra.vramFp16).toBeGreaterThanOrEqual(infra.vramFp8)
      expect(infra.vramFp8).toBeGreaterThanOrEqual(infra.vramInt8)
      expect(infra.vramInt8).toBeGreaterThanOrEqual(infra.vramInt4)
    }
  })

  it('should maintain quantization VRAM ordering when all fields present', () => {
    const modelsWithQuant = ossModelsWithInfra.filter(
      (m) => m.infrastructure.vramQ6k !== undefined
    )
    for (const model of modelsWithQuant) {
      const infra = model.infrastructure
      expect(infra.vramQ6k).toBeGreaterThanOrEqual(infra.vramQ5k)
      expect(infra.vramQ5k).toBeGreaterThanOrEqual(infra.vramQ4kM)
      expect(infra.vramQ4kM).toBeGreaterThanOrEqual(infra.vramQ3k)
      expect(infra.vramQ3k).toBeGreaterThanOrEqual(infra.vramQ2k)
    }
  })
})

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
      weights: { reasoning: 0.3, korean: 0.2, coding: 0, knowledge: 0.2, cost: 0.3 },
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
