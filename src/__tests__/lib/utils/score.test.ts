import { calculateFitnessScore } from '@/lib/utils/score'
import type { IModelScores, IModelPricing } from '@/lib/types/model'
import type { IPresetWeights } from '@/lib/types/preset'

describe('calculateFitnessScore', () => {
  const scores: IModelScores = {
    quality: 90, speed: 80, reasoning: 85, coding: 92, multimodal: 70,
  }
  const pricing: IModelPricing = {
    input: 3.0, output: 15.0, cachingDiscount: 0.9, batchDiscount: 0.5,
  }
  const koreanScore = 85

  it('should calculate weighted fitness score', () => {
    const weights: IPresetWeights = {
      quality: 0.20, speed: 0.25, reasoning: 0.10,
      coding: 0, multimodal: 0, cost: 0.20, korean: 0.25,
    }

    const result = calculateFitnessScore(scores, pricing, koreanScore, weights)

    // quality: 90*0.20=18, speed: 80*0.25=20, reasoning: 85*0.10=8.5
    // cost: (100 - (15/60)*100)*0.20 = 75*0.20=15, korean: 85*0.25=21.25
    expect(result).toBeCloseTo(82.75, 1)
  })

  it('should return 0 for all-zero weights', () => {
    const weights: IPresetWeights = {
      quality: 0, speed: 0, reasoning: 0, coding: 0, multimodal: 0, cost: 0, korean: 0,
    }
    const result = calculateFitnessScore(scores, pricing, koreanScore, weights)
    expect(result).toBe(0)
  })

  it('should handle expensive models with low cost score', () => {
    const expensivePricing: IModelPricing = {
      input: 15.0, output: 60.0, cachingDiscount: 0, batchDiscount: 0,
    }
    const weights: IPresetWeights = {
      quality: 0, speed: 0, reasoning: 0, coding: 0, multimodal: 0, cost: 1.0, korean: 0,
    }
    const result = calculateFitnessScore(scores, expensivePricing, koreanScore, weights)
    expect(result).toBe(0)
  })
})
