/**
 * @jest-environment node
 */
import mongoose from 'mongoose'
import { ModelModel, ModelSchema } from '@/lib/db/models/model'

describe('Model Schema', () => {
  it('should have required fields', () => {
    const requiredPaths = ['name', 'slug', 'provider', 'type', 'releaseDate']
    for (const path of requiredPaths) {
      expect(ModelSchema.path(path)).toBeDefined()
      expect(ModelSchema.path(path).isRequired).toBeTruthy()
    }
  })

  it('should have valid enum values for type', () => {
    const typePath = ModelSchema.path('type') as any
    expect(typePath.enumValues).toEqual(['commercial', 'open-source'])
  })

  it('should have valid enum values for tier', () => {
    const tierPath = ModelSchema.path('tier') as any
    expect(tierPath.enumValues).toEqual(['flagship', 'mid', 'small', 'mini', 'micro'])
  })

  it('should compute isRecentlyReleased virtual for recent models', () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 10)
    const doc = new ModelModel({
      name: 'Test', slug: 'test', provider: 'Test', type: 'commercial',
      releaseDate: recentDate
    })
    expect(doc.get('isRecentlyReleased')).toBe(true)
  })

  it('should compute isRecentlyReleased virtual as false for old models', () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 60)
    const doc = new ModelModel({
      name: 'Old', slug: 'old', provider: 'Test', type: 'commercial',
      releaseDate: oldDate
    })
    expect(doc.get('isRecentlyReleased')).toBe(false)
  })

  describe('infrastructure VRAM fields', () => {
    const vramFields = [
      'infrastructure.vramFp16',
      'infrastructure.vramInt8',
      'infrastructure.vramInt4',
      'infrastructure.vramFp8',
      'infrastructure.vramQ6k',
      'infrastructure.vramQ5k',
      'infrastructure.vramQ4kM',
      'infrastructure.vramQ3k',
      'infrastructure.vramQ2k',
    ]

    it('should have all VRAM fields defined in schema', () => {
      for (const field of vramFields) {
        expect(ModelSchema.path(field)).toBeDefined()
      }
    })

    it('should accept a document with new VRAM fields', () => {
      const doc = new ModelModel({
        name: 'VRAM Test', slug: 'vram-test', provider: 'Test', type: 'open-source',
        releaseDate: new Date(),
        infrastructure: {
          minGpu: 'A100 80GB',
          vramFp16: 64,
          vramInt8: 32,
          vramInt4: 16,
          vramFp8: 32,
          vramQ6k: 29,
          vramQ5k: 24,
          vramQ4kM: 20,
          vramQ3k: 14,
          vramQ2k: 10,
          recommendedFramework: ['vLLM'],
          estimatedTps: 50,
        },
      })

      expect(doc.infrastructure!.vramFp8).toBe(32)
      expect(doc.infrastructure!.vramQ6k).toBe(29)
      expect(doc.infrastructure!.vramQ5k).toBe(24)
      expect(doc.infrastructure!.vramQ4kM).toBe(20)
      expect(doc.infrastructure!.vramQ3k).toBe(14)
      expect(doc.infrastructure!.vramQ2k).toBe(10)
    })

    it('should allow new VRAM fields to be undefined (optional)', () => {
      const doc = new ModelModel({
        name: 'No VRAM', slug: 'no-vram', provider: 'Test', type: 'open-source',
        releaseDate: new Date(),
        infrastructure: {
          minGpu: 'A100 80GB',
          vramFp16: 64,
          vramInt8: 32,
          vramInt4: 16,
          recommendedFramework: ['vLLM'],
          estimatedTps: 50,
        },
      })

      expect(doc.infrastructure!.vramFp8).toBeUndefined()
      expect(doc.infrastructure!.vramQ6k).toBeUndefined()
    })
  })
})
