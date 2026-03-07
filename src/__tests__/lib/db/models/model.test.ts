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
})
