/**
 * @jest-environment node
 */
const mockModels = [
  {
    name: 'Model A', slug: 'model-a', provider: 'TestCo',
    scores: { quality: 90, speed: 80, reasoning: 85, coding: 92, multimodal: 70 },
    pricing: { input: 3, output: 15, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 85]]),
  },
  {
    name: 'Model B', slug: 'model-b', provider: 'TestCo',
    scores: { quality: 70, speed: 95, reasoning: 60, coding: 65, multimodal: 50 },
    pricing: { input: 0.15, output: 0.6, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 75]]),
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
    const result = await getRankedModelsForPreset(mockPreset as any, 10)

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBeDefined()
    expect(result[0].score).toBeGreaterThan(0)
    expect(result[0].breakdown).toBeDefined()
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score)
  })
})
