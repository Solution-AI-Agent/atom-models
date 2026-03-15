import {
  resolvePrice,
  calculateApiCost,
  calculateBreakeven,
  calculateRouting,
} from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

const mockCommercialModel: IModel = {
  name: 'Test Model',
  slug: 'test-model',
  providerId: 'openai',
  type: 'commercial',
  tier: 'flagship',
  pricing: {
    inputPer1m: 10,
    outputPer1m: 30,
    pricingType: 'api',
    cachedInputPer1m: 5,
    batchInputPer1m: 5,
    batchOutputPer1m: 15,
  },
} as IModel

const mockAnthropicModel: IModel = {
  ...mockCommercialModel,
  name: 'Anthropic Model',
  slug: 'anthropic-model',
  providerId: 'anthropic',
  pricing: {
    inputPer1m: 10,
    outputPer1m: 30,
    pricingType: 'api',
    cachedInputPer1m: null,
    batchInputPer1m: null,
    batchOutputPer1m: null,
  },
} as IModel

const mockOssModel: IModel = {
  ...mockCommercialModel,
  name: 'OSS Model',
  slug: 'oss-model',
  type: 'open-source',
  pricing: {
    inputPer1m: null,
    outputPer1m: null,
    pricingType: 'self-hosted',
    cachedInputPer1m: null,
    batchInputPer1m: null,
    batchOutputPer1m: null,
  },
} as IModel

const defaultInputs: ISimulatorInputs = {
  dailyRequests: 1000,
  avgInputTokens: 500,
  avgOutputTokens: 300,
  monthlyDays: 30,
}

const defaultApiInputs: IApiCostInputs = {
  cacheRate: 0,
  batchRate: 0,
}

describe('resolvePrice', () => {
  it('returns explicit cached price when available', () => {
    const result = resolvePrice(mockCommercialModel)
    expect(result.cachedInputPer1m).toBe(5)
    expect(result.batchInputPer1m).toBe(5)
    expect(result.batchOutputPer1m).toBe(15)
  })

  it('calculates fallback prices using provider discount', () => {
    const result = resolvePrice(mockAnthropicModel)
    // Anthropic: 90% cache discount => 10 * 0.1 = 1
    expect(result.cachedInputPer1m).toBeCloseTo(1)
    // Anthropic: 50% batch discount => 10 * 0.5 = 5
    expect(result.batchInputPer1m).toBe(5)
    expect(result.batchOutputPer1m).toBe(15)
  })

  it('uses default 50% discount for unknown providers', () => {
    const model = { ...mockAnthropicModel, providerId: 'unknown' } as IModel
    const result = resolvePrice(model)
    expect(result.cachedInputPer1m).toBe(5)  // 10 * 0.5
    expect(result.batchInputPer1m).toBe(5)   // 10 * 0.5
    expect(result.batchOutputPer1m).toBe(15)  // 30 * 0.5
  })

  it('handles zero inputPer1m gracefully', () => {
    const model = {
      ...mockCommercialModel,
      pricing: { ...mockCommercialModel.pricing, inputPer1m: 0, cachedInputPer1m: null, batchInputPer1m: null },
    } as IModel
    const result = resolvePrice(model)
    expect(result.cachedInputPer1m).toBe(0)
    expect(result.batchInputPer1m).toBe(0)
  })
})

describe('calculateApiCost', () => {
  it('calculates basic cost with no caching or batch', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, defaultApiInputs)
    // monthly input tokens: 1000 * 500 * 30 = 15,000,000
    // monthly output tokens: 1000 * 300 * 30 = 9,000,000
    // cost: (15M * 10 + 9M * 30) / 1M = 150 + 270 = 420
    expect(result.totalMonthlyCost).toBe(420)
    expect(result.totalAnnualCost).toBe(5040)
  })

  it('applies caching discount to input tokens', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, {
      cacheRate: 0.5,
      batchRate: 0,
    })
    // realtime input: 7.5M * 10 = 75
    // cached input: 7.5M * 5 = 37.5
    // output: 9M * 30 = 270
    // total: 75 + 37.5 + 270 = 382.5
    expect(result.totalMonthlyCost).toBe(382.5)
  })

  it('applies batch discount to both input and output', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, {
      cacheRate: 0,
      batchRate: 1.0,
    })
    // all input via batch: 15M * 5 = 75
    // all output via batch: 9M * 15 = 135
    // total: 75 + 135 = 210
    expect(result.totalMonthlyCost).toBe(210)
  })

  it('returns zero cost for OSS models', () => {
    const result = calculateApiCost(mockOssModel, defaultInputs, defaultApiInputs)
    expect(result.totalMonthlyCost).toBe(0)
  })

  it('handles combined cache + batch with multiplicative stacking', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, {
      cacheRate: 0.5,
      batchRate: 0.5,
    })
    // Input segments (15M total):
    //   realtime (25%): 3.75M * 10 = 37.5
    //   cached (25%): 3.75M * 5 = 18.75
    //   batch (25%): 3.75M * 5 = 18.75
    //   batch+cached (25%): 3.75M * (5 * 5/10) = 3.75M * 2.5 = 9.375
    // Output segments (9M total):
    //   realtime (50%): 4.5M * 30 = 135
    //   batch (50%): 4.5M * 15 = 67.5
    // total: 37.5 + 18.75 + 18.75 + 9.375 + 135 + 67.5 = 286.875
    expect(result.totalMonthlyCost).toBeCloseTo(286.875)
  })
})

describe('calculateBreakeven', () => {
  it('finds breakeven point where self-hosted becomes cheaper', () => {
    const result = calculateBreakeven({
      commercialModel: mockCommercialModel,
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
      hourlyRate: 2.0,
      gpuCount: 1,
      dailyHours: 24,
      monthlyDays: 30,
      monthlyOverhead: 0,
    })
    // Self-hosted: $2 * 1 * 24 * 30 = $1440/mo (fixed)
    // API: scales with requests
    // At 1000 req/day: API = $420, self-hosted = $1440
    // Breakeven: 1440 / (420/1000) = ~3429 req/day
    expect(result.selfHostedMonthlyCost).toBe(1440)
    expect(result.apiMonthlyCost).toBe(420)
    expect(result.breakevenDailyRequests).toBeGreaterThan(3000)
    expect(result.breakevenDailyRequests).toBeLessThan(4000)
    expect(result.chartData.length).toBeGreaterThan(0)
  })

  it('returns null breakeven when API cost is zero (OSS model)', () => {
    const result = calculateBreakeven({
      commercialModel: mockOssModel,
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
      hourlyRate: 2.0,
      gpuCount: 1,
      dailyHours: 24,
      monthlyDays: 30,
      monthlyOverhead: 0,
    })
    // OSS model has $0 API cost, so costPerRequest = 0 => breakeven = null
    expect(result.breakevenDailyRequests).toBeNull()
  })
})

describe('calculateRouting', () => {
  it('calculates routing savings compared to most expensive model', () => {
    const cheapModel = {
      ...mockCommercialModel,
      name: 'Cheap',
      pricing: {
        ...mockCommercialModel.pricing,
        inputPer1m: 1,
        outputPer1m: 3,
        cachedInputPer1m: 0.5,
        batchInputPer1m: 0.5,
        batchOutputPer1m: 1.5,
      },
    } as IModel

    const result = calculateRouting({
      models: [mockCommercialModel, cheapModel],
      ratios: [0.3, 0.7],
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
    })

    expect(result.baselineMonthlyCost).toBe(420) // expensive model at 100%
    expect(result.routedMonthlyCost).toBeLessThan(420)
    expect(result.savingsRate).toBeGreaterThan(0)
    expect(result.perModelCosts).toHaveLength(2)
  })

  it('returns 0% savings when single model at 100%', () => {
    const result = calculateRouting({
      models: [mockCommercialModel],
      ratios: [1.0],
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
    })
    expect(result.savingsRate).toBe(0)
  })
})
