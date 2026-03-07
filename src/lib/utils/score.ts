import type { IModelScores, IModelPricing } from '@/lib/types/model'
import type { IPresetWeights } from '@/lib/types/preset'

const MAX_OUTPUT_PRICE = 60

export function calculateFitnessScore(
  scores: IModelScores,
  pricing: IModelPricing,
  koreanScore: number,
  weights: IPresetWeights,
): number {
  const costScore = Math.max(0, 100 - (pricing.output / MAX_OUTPUT_PRICE) * 100)

  return (
    scores.quality    * weights.quality +
    scores.speed      * weights.speed +
    scores.reasoning  * weights.reasoning +
    scores.coding     * weights.coding +
    scores.multimodal * weights.multimodal +
    costScore         * weights.cost +
    koreanScore       * weights.korean
  )
}

export function calculateFitnessBreakdown(
  scores: IModelScores,
  pricing: IModelPricing,
  koreanScore: number,
  weights: IPresetWeights,
): Record<string, number> {
  const costScore = Math.max(0, 100 - (pricing.output / MAX_OUTPUT_PRICE) * 100)

  return {
    quality:    scores.quality    * weights.quality,
    speed:      scores.speed      * weights.speed,
    reasoning:  scores.reasoning  * weights.reasoning,
    coding:     scores.coding     * weights.coding,
    multimodal: scores.multimodal * weights.multimodal,
    cost:       costScore         * weights.cost,
    korean:     koreanScore       * weights.korean,
  }
}
