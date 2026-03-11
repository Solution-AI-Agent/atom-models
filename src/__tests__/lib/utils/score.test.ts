import {
  calculateDimensionScore,
  calculateCostScore,
  calculateFitnessScore,
  calculateFitnessBreakdown,
} from '@/lib/utils/score'
import type { IModelPricing } from '@/lib/types/model'
import type { IPresetWeights } from '@/lib/types/preset'
import type { IBvaFormulaEntry } from '@/lib/types/bva'

describe('calculateDimensionScore', () => {
  const reasoningFormula: readonly IBvaFormulaEntry[] = [
    { benchmark: 'gpqa', weight: 0.4 },
    { benchmark: 'aime', weight: 0.3 },
    { benchmark: 'hle', weight: 0.3 },
  ]

  it('should calculate weighted score from all available benchmarks', () => {
    const benchmarks = { gpqa: 70, aime: 80, hle: 20 }

    const result = calculateDimensionScore(benchmarks, reasoningFormula)

    // 70*0.4 + 80*0.3 + 20*0.3 = 28 + 24 + 6 = 58
    expect(result).toBeCloseTo(58, 1)
  })

  it('should renormalize weights when some benchmarks are null', () => {
    const benchmarks = { gpqa: 70, aime: null, hle: 20 }

    const result = calculateDimensionScore(benchmarks, reasoningFormula)

    // Available: gpqa(0.4) + hle(0.3) = 0.7 total
    // Renormalized: gpqa = 0.4/0.7, hle = 0.3/0.7
    // 70*(0.4/0.7) + 20*(0.3/0.7) = 40 + 8.571... = 48.571...
    expect(result).toBeCloseTo(48.571, 1)
  })

  it('should renormalize weights when some benchmarks are missing (undefined)', () => {
    const benchmarks = { gpqa: 70 }

    const result = calculateDimensionScore(benchmarks, reasoningFormula)

    // Only gpqa available, weight = 0.4/0.4 = 1.0
    // 70 * 1.0 = 70
    expect(result).toBeCloseTo(70, 1)
  })

  it('should return null when all benchmarks are null', () => {
    const benchmarks = { gpqa: null, aime: null, hle: null }

    const result = calculateDimensionScore(benchmarks, reasoningFormula)

    expect(result).toBeNull()
  })

  it('should return null when all benchmarks are missing', () => {
    const benchmarks = {}

    const result = calculateDimensionScore(benchmarks, reasoningFormula)

    expect(result).toBeNull()
  })

  it('should handle single-benchmark formula (coding)', () => {
    const codingFormula: readonly IBvaFormulaEntry[] = [
      { benchmark: 'swe_bench', weight: 1.0 },
    ]
    const benchmarks = { swe_bench: 49.0 }

    const result = calculateDimensionScore(benchmarks, codingFormula)

    expect(result).toBeCloseTo(49.0, 1)
  })

  it('should handle korean dimension formula', () => {
    const koreanFormula: readonly IBvaFormulaEntry[] = [
      { benchmark: 'kmmlu', weight: 0.7 },
      { benchmark: 'mgsm', weight: 0.3 },
    ]
    const benchmarks = { kmmlu: 65, mgsm: 90 }

    const result = calculateDimensionScore(benchmarks, koreanFormula)

    // 65*0.7 + 90*0.3 = 45.5 + 27 = 72.5
    expect(result).toBeCloseTo(72.5, 1)
  })

  it('should handle korean with only KMMLU available', () => {
    const koreanFormula: readonly IBvaFormulaEntry[] = [
      { benchmark: 'kmmlu', weight: 0.7 },
      { benchmark: 'mgsm', weight: 0.3 },
    ]
    const benchmarks = { kmmlu: 65, mgsm: null }

    const result = calculateDimensionScore(benchmarks, koreanFormula)

    // Only kmmlu: 65 * (0.7/0.7) = 65
    expect(result).toBeCloseTo(65, 1)
  })
})

describe('calculateCostScore', () => {
  it('should return 100 for open-source models', () => {
    const pricing: IModelPricing = {
      inputPer1m: 0, outputPer1m: 0, pricingType: 'api',
    }

    const result = calculateCostScore(pricing, 'open-source')

    expect(result).toBe(100)
  })

  it('should calculate cost score for commercial models', () => {
    const pricing: IModelPricing = {
      inputPer1m: 3, outputPer1m: 15, pricingType: 'api',
    }

    const result = calculateCostScore(pricing, 'commercial')

    // max(0, 100 - (15/60)*100) = max(0, 100 - 25) = 75
    expect(result).toBeCloseTo(75, 1)
  })

  it('should return 0 for maximum-priced commercial models', () => {
    const pricing: IModelPricing = {
      inputPer1m: 15, outputPer1m: 60, pricingType: 'api',
    }

    const result = calculateCostScore(pricing, 'commercial')

    expect(result).toBe(0)
  })

  it('should clamp to 0 for over-priced models', () => {
    const pricing: IModelPricing = {
      inputPer1m: 30, outputPer1m: 120, pricingType: 'api',
    }

    const result = calculateCostScore(pricing, 'commercial')

    expect(result).toBe(0)
  })

  it('should return close to 100 for very cheap commercial models', () => {
    const pricing: IModelPricing = {
      inputPer1m: 0.01, outputPer1m: 0.06, pricingType: 'api',
    }

    const result = calculateCostScore(pricing, 'commercial')

    // max(0, 100 - (0.06/60)*100) = max(0, 100 - 0.1) = 99.9
    expect(result).toBeCloseTo(99.9, 1)
  })
})

describe('calculateFitnessScore', () => {
  const weights: IPresetWeights = {
    reasoning: 0.25,
    korean: 0.20,
    coding: 0.15,
    knowledge: 0.15,
    reliability: 0,
    toolUse: 0,
    instruction: 0,
    longContext: 0,
    cost: 0.25,
  }

  it('should calculate weighted fitness from dimension scores and cost', () => {
    const dimensionScores = {
      reasoning: 70 as number | null,
      korean: 80 as number | null,
      coding: 50 as number | null,
      knowledge: 85 as number | null,
      reliability: null as number | null,
      toolUse: null as number | null,
      instruction: null as number | null,
      longContext: null as number | null,
    }
    const costScore = 75

    const result = calculateFitnessScore(dimensionScores, costScore, weights)

    // 70*0.25 + 80*0.20 + 50*0.15 + 85*0.15 + 75*0.25
    // = 17.5 + 16 + 7.5 + 12.75 + 18.75 = 72.5
    expect(result).toBeCloseTo(72.5, 1)
  })

  it('should renormalize when some dimension scores are null', () => {
    const dimensionScores = {
      reasoning: 70 as number | null,
      korean: null as number | null,
      coding: 50 as number | null,
      knowledge: null as number | null,
      reliability: null as number | null,
      toolUse: null as number | null,
      instruction: null as number | null,
      longContext: null as number | null,
    }
    const costScore = 75

    const result = calculateFitnessScore(dimensionScores, costScore, weights)

    // Available: reasoning(0.25) + coding(0.15) + cost(0.25) = 0.65
    // 70*0.25 + 50*0.15 + 75*0.25 = 17.5 + 7.5 + 18.75 = 43.75
    // 43.75 / 0.65 = 67.307...
    expect(result).toBeCloseTo(67.308, 1)
  })

  it('should handle all dimension scores null (only cost)', () => {
    const dimensionScores = {
      reasoning: null as number | null,
      korean: null as number | null,
      coding: null as number | null,
      knowledge: null as number | null,
      reliability: null as number | null,
      toolUse: null as number | null,
      instruction: null as number | null,
      longContext: null as number | null,
    }
    const costScore = 80

    const result = calculateFitnessScore(dimensionScores, costScore, weights)

    // Only cost: 80*0.25 / 0.25 = 80
    expect(result).toBeCloseTo(80, 1)
  })

  it('should return 0 when all weights are 0', () => {
    const zeroWeights: IPresetWeights = {
      reasoning: 0, korean: 0, coding: 0, knowledge: 0,
      reliability: 0, toolUse: 0, instruction: 0, longContext: 0,
      cost: 0,
    }
    const dimensionScores = {
      reasoning: 70 as number | null,
      korean: 80 as number | null,
      coding: 50 as number | null,
      knowledge: 85 as number | null,
      reliability: null as number | null,
      toolUse: null as number | null,
      instruction: null as number | null,
      longContext: null as number | null,
    }

    const result = calculateFitnessScore(dimensionScores, 75, zeroWeights)

    expect(result).toBe(0)
  })

  it('should handle OSS model with costScore 100', () => {
    const dimensionScores = {
      reasoning: 60 as number | null,
      korean: 50 as number | null,
      coding: 40 as number | null,
      knowledge: 55 as number | null,
      reliability: null as number | null,
      toolUse: null as number | null,
      instruction: null as number | null,
      longContext: null as number | null,
    }

    const result = calculateFitnessScore(dimensionScores, 100, weights)

    // 60*0.25 + 50*0.20 + 40*0.15 + 55*0.15 + 100*0.25
    // = 15 + 10 + 6 + 8.25 + 25 = 64.25
    expect(result).toBeCloseTo(64.25, 1)
  })
})

describe('calculateFitnessBreakdown', () => {
  const weights: IPresetWeights = {
    reasoning: 0.25,
    korean: 0.20,
    coding: 0.15,
    knowledge: 0.15,
    reliability: 0,
    toolUse: 0,
    instruction: 0,
    longContext: 0,
    cost: 0.25,
  }

  it('should return weighted contribution of each dimension', () => {
    const dimensionScores = {
      reasoning: 70 as number | null,
      korean: 80 as number | null,
      coding: 50 as number | null,
      knowledge: 85 as number | null,
      reliability: null as number | null,
      toolUse: null as number | null,
      instruction: null as number | null,
      longContext: null as number | null,
    }
    const costScore = 75

    const result = calculateFitnessBreakdown(dimensionScores, costScore, weights)

    expect(result.reasoning).toBeCloseTo(17.5, 1)
    expect(result.korean).toBeCloseTo(16, 1)
    expect(result.coding).toBeCloseTo(7.5, 1)
    expect(result.knowledge).toBeCloseTo(12.75, 1)
    expect(result.reliability).toBe(0)
    expect(result.toolUse).toBe(0)
    expect(result.instruction).toBe(0)
    expect(result.longContext).toBe(0)
    expect(result.cost).toBeCloseTo(18.75, 1)
  })

  it('should use 0 for null dimension scores', () => {
    const dimensionScores = {
      reasoning: 70 as number | null,
      korean: null as number | null,
      coding: 50 as number | null,
      knowledge: null as number | null,
      reliability: null as number | null,
      toolUse: null as number | null,
      instruction: null as number | null,
      longContext: null as number | null,
    }
    const costScore = 75

    const result = calculateFitnessBreakdown(dimensionScores, costScore, weights)

    expect(result.reasoning).toBeCloseTo(17.5, 1)
    expect(result.korean).toBe(0)
    expect(result.coding).toBeCloseTo(7.5, 1)
    expect(result.knowledge).toBe(0)
    expect(result.reliability).toBe(0)
    expect(result.toolUse).toBe(0)
    expect(result.instruction).toBe(0)
    expect(result.longContext).toBe(0)
    expect(result.cost).toBeCloseTo(18.75, 1)
  })
})
