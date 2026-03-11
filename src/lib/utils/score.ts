import type { IModelPricing, ModelType } from '@/lib/types/model'
import type { IPresetWeights } from '@/lib/types/preset'
import type { BvaDimensionKey, IBvaFormulaEntry } from '@/lib/types/bva'

const MAX_OUTPUT_PRICE = 60

const DIMENSION_KEYS: readonly BvaDimensionKey[] = [
  'reasoning', 'korean', 'coding', 'knowledge',
] as const

export function calculateDimensionScore(
  benchmarks: Partial<Record<string, number | null>>,
  formula: readonly IBvaFormulaEntry[],
): number | null {
  const available = formula.filter(
    (entry) => benchmarks[entry.benchmark] != null,
  )

  if (available.length === 0) return null

  const totalWeight = available.reduce((sum, entry) => sum + entry.weight, 0)

  return available.reduce((score, entry) => {
    const value = benchmarks[entry.benchmark] as number
    return score + value * (entry.weight / totalWeight)
  }, 0)
}

export function calculateCostScore(
  pricing: IModelPricing,
  type: ModelType,
): number {
  if (type === 'open-source') return 100
  return Math.max(0, 100 - (pricing.output / MAX_OUTPUT_PRICE) * 100)
}

export function calculateFitnessScore(
  dimensionScores: Record<BvaDimensionKey, number | null>,
  costScore: number,
  weights: IPresetWeights,
): number {
  let totalScore = costScore * weights.cost
  let usedWeight = weights.cost

  for (const key of DIMENSION_KEYS) {
    const dimScore = dimensionScores[key]
    if (dimScore != null) {
      totalScore += dimScore * weights[key]
      usedWeight += weights[key]
    }
  }

  return usedWeight > 0 ? totalScore / usedWeight : 0
}

export function calculateFitnessBreakdown(
  dimensionScores: Record<BvaDimensionKey, number | null>,
  costScore: number,
  weights: IPresetWeights,
): Record<BvaDimensionKey | 'cost', number> {
  return {
    reasoning:  (dimensionScores.reasoning ?? 0) * weights.reasoning,
    korean:     (dimensionScores.korean ?? 0) * weights.korean,
    coding:     (dimensionScores.coding ?? 0) * weights.coding,
    knowledge:  (dimensionScores.knowledge ?? 0) * weights.knowledge,
    cost:       costScore * weights.cost,
  }
}
