/**
 * @jest-environment node
 */
const mockModels = [
  {
    name: 'Model A', slug: 'model-a', provider: 'ProviderA', type: 'commercial',
    scores: { quality: 90, speed: 80, reasoning: 85, coding: 92, multimodal: 70 },
    pricing: { input: 3, output: 15, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 85]]),
  },
  {
    name: 'Model B', slug: 'model-b', provider: 'ProviderA', type: 'commercial',
    scores: { quality: 70, speed: 95, reasoning: 60, coding: 65, multimodal: 50 },
    pricing: { input: 0.15, output: 0.6, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 75]]),
  },
  {
    name: 'Model C', slug: 'model-c', provider: 'ProviderA', type: 'commercial',
    scores: { quality: 80, speed: 85, reasoning: 75, coding: 80, multimodal: 60 },
    pricing: { input: 1, output: 5, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 80]]),
  },
  {
    name: 'Model D', slug: 'model-d', provider: 'ProviderB', type: 'commercial',
    scores: { quality: 75, speed: 90, reasoning: 70, coding: 70, multimodal: 55 },
    pricing: { input: 0.5, output: 2, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 78]]),
  },
]

jest.mock('@/lib/db/models/model', () => ({
  ModelModel: {
    find: () => ({ lean: () => Promise.resolve(mockModels) }),
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

import { getRankedModelsForPreset } from '@/lib/services/recommendation.service'

const mockPreset = {
  weights: {
    quality: 0.20, speed: 0.25, reasoning: 0.10,
    coding: 0, multimodal: 0, cost: 0.20, korean: 0.25,
  },
}

describe('Recommendation Service', () => {
  it('should rank models by fitness score', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0].slug).toBeDefined()
    expect(result[0].score).toBeGreaterThan(0)
    expect(result[0].breakdown).toBeDefined()
  })

  it('should limit to max 2 models per provider', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const providerCounts: Record<string, number> = {}
    for (const model of result) {
      providerCounts[model.provider] = (providerCounts[model.provider] ?? 0) + 1
    }

    for (const count of Object.values(providerCounts)) {
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('should include models from multiple providers when available', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const providers = new Set(result.map((m) => m.provider))
    expect(providers.size).toBeGreaterThan(1)
  })
})
