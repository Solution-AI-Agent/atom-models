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

  it('should have vramQ6k field on all OSS models with infrastructure', () => {
    for (const model of ossModelsWithInfra) {
      expect(model.infrastructure.vramQ6k).toBeDefined()
      expect(typeof model.infrastructure.vramQ6k).toBe('number')
      expect(model.infrastructure.vramQ6k).toBeGreaterThan(0)
    }
  })

  it('should have vramQ5k field on all OSS models with infrastructure', () => {
    for (const model of ossModelsWithInfra) {
      expect(model.infrastructure.vramQ5k).toBeDefined()
      expect(typeof model.infrastructure.vramQ5k).toBe('number')
      expect(model.infrastructure.vramQ5k).toBeGreaterThan(0)
    }
  })

  it('should have vramQ4kM field on all OSS models with infrastructure', () => {
    for (const model of ossModelsWithInfra) {
      expect(model.infrastructure.vramQ4kM).toBeDefined()
      expect(typeof model.infrastructure.vramQ4kM).toBe('number')
      expect(model.infrastructure.vramQ4kM).toBeGreaterThan(0)
    }
  })

  it('should have vramQ3k field on all OSS models with infrastructure', () => {
    for (const model of ossModelsWithInfra) {
      expect(model.infrastructure.vramQ3k).toBeDefined()
      expect(typeof model.infrastructure.vramQ3k).toBe('number')
      expect(model.infrastructure.vramQ3k).toBeGreaterThan(0)
    }
  })

  it('should have vramQ2k field on all OSS models with infrastructure', () => {
    for (const model of ossModelsWithInfra) {
      expect(model.infrastructure.vramQ2k).toBeDefined()
      expect(typeof model.infrastructure.vramQ2k).toBe('number')
      expect(model.infrastructure.vramQ2k).toBeGreaterThan(0)
    }
  })

  it('should maintain VRAM ordering: fp16 > fp8 > int8 >= q6k > q5k > q4kM > int4 >= q3k > q2k', () => {
    for (const model of ossModelsWithInfra) {
      const infra = model.infrastructure
      expect(infra.vramFp16).toBeGreaterThanOrEqual(infra.vramFp8)
      expect(infra.vramFp8).toBeGreaterThanOrEqual(infra.vramInt8)
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
