import type { IModel } from '@/lib/types/model'
import type {
  ISimulatorInputs,
  IApiCostInputs,
  IModelCostBreakdown,
  IBreakevenResult,
  IBreakevenChartPoint,
  IRoutingResult,
} from '@/lib/types/simulator'

const DISCOUNTS: Record<string, { cache: number; batch: number }> = {
  anthropic: { cache: 0.9, batch: 0.5 },
  google: { cache: 0.75, batch: 0.5 },
  openai: { cache: 0.5, batch: 0.5 },
  _default: { cache: 0.5, batch: 0.5 },
}

interface IResolvedPrices {
  readonly inputPer1m: number
  readonly outputPer1m: number
  readonly cachedInputPer1m: number
  readonly batchInputPer1m: number
  readonly batchOutputPer1m: number
}

export function resolvePrice(model: IModel): IResolvedPrices {
  const input = model.pricing.inputPer1m ?? 0
  const output = model.pricing.outputPer1m ?? 0
  const provider = model.providerId.toLowerCase()
  const discounts = DISCOUNTS[provider] ?? DISCOUNTS._default

  return {
    inputPer1m: input,
    outputPer1m: output,
    cachedInputPer1m: model.pricing.cachedInputPer1m ?? input * (1 - discounts.cache),
    batchInputPer1m: model.pricing.batchInputPer1m ?? input * (1 - discounts.batch),
    batchOutputPer1m: model.pricing.batchOutputPer1m ?? output * (1 - discounts.batch),
  }
}

export function calculateApiCost(
  model: IModel,
  inputs: ISimulatorInputs,
  apiInputs: IApiCostInputs,
): IModelCostBreakdown {
  if (model.type === 'open-source') {
    return {
      model,
      realtimeInputCost: 0,
      cachedInputCost: 0,
      batchInputCost: 0,
      batchCachedInputCost: 0,
      realtimeOutputCost: 0,
      batchOutputCost: 0,
      totalMonthlyCost: 0,
      totalAnnualCost: 0,
    }
  }

  const prices = resolvePrice(model)
  const { cacheRate, batchRate } = apiInputs
  const totalInputTokens = inputs.dailyRequests * inputs.avgInputTokens * inputs.monthlyDays
  const totalOutputTokens = inputs.dailyRequests * inputs.avgOutputTokens * inputs.monthlyDays

  const realtimeInputTokens = totalInputTokens * (1 - batchRate) * (1 - cacheRate)
  const cachedInputTokens = totalInputTokens * (1 - batchRate) * cacheRate
  const batchInputTokens = totalInputTokens * batchRate * (1 - cacheRate)
  const batchCachedInputTokens = totalInputTokens * batchRate * cacheRate

  const realtimeOutputTokens = totalOutputTokens * (1 - batchRate)
  const batchOutputTokens = totalOutputTokens * batchRate

  // Batch+cached: multiplicative stacking
  const batchCachedPrice = prices.inputPer1m > 0
    ? prices.batchInputPer1m * (prices.cachedInputPer1m / prices.inputPer1m)
    : 0

  const realtimeInputCost = (realtimeInputTokens * prices.inputPer1m) / 1_000_000
  const cachedInputCost = (cachedInputTokens * prices.cachedInputPer1m) / 1_000_000
  const batchInputCost = (batchInputTokens * prices.batchInputPer1m) / 1_000_000
  const batchCachedInputCost = (batchCachedInputTokens * batchCachedPrice) / 1_000_000
  const realtimeOutputCost = (realtimeOutputTokens * prices.outputPer1m) / 1_000_000
  const batchOutputCost = (batchOutputTokens * prices.batchOutputPer1m) / 1_000_000

  const totalMonthlyCost =
    realtimeInputCost + cachedInputCost + batchInputCost +
    batchCachedInputCost + realtimeOutputCost + batchOutputCost

  return {
    model,
    realtimeInputCost,
    cachedInputCost,
    batchInputCost,
    batchCachedInputCost,
    realtimeOutputCost,
    batchOutputCost,
    totalMonthlyCost,
    totalAnnualCost: totalMonthlyCost * 12,
  }
}

export function calculateBreakeven(options: {
  readonly commercialModel: IModel
  readonly inputs: ISimulatorInputs
  readonly apiCostInputs: IApiCostInputs
  readonly hourlyRate: number
  readonly gpuCount: number
  readonly dailyHours: number
  readonly monthlyDays: number
  readonly monthlyOverhead: number
}): IBreakevenResult {
  const {
    commercialModel, inputs, apiCostInputs,
    hourlyRate, gpuCount, dailyHours, monthlyDays, monthlyOverhead,
  } = options

  const selfHostedMonthlyCost = hourlyRate * gpuCount * dailyHours * monthlyDays + monthlyOverhead

  const apiResult = calculateApiCost(commercialModel, inputs, apiCostInputs)
  const apiMonthlyCost = apiResult.totalMonthlyCost

  // Cost per request for API
  const costPerRequest = inputs.dailyRequests > 0
    ? apiMonthlyCost / (inputs.dailyRequests * monthlyDays)
    : 0

  // Breakeven: selfHostedMonthlyCost = costPerRequest * breakevenRequests * monthlyDays
  const breakevenDailyRequests = costPerRequest > 0
    ? selfHostedMonthlyCost / (costPerRequest * monthlyDays)
    : null

  // Cap at 1M daily requests — beyond this is unrealistic
  const MAX_REASONABLE_DAILY = 1_000_000
  const finalBreakeven = breakevenDailyRequests !== null && breakevenDailyRequests <= MAX_REASONABLE_DAILY
    ? Math.round(breakevenDailyRequests)
    : null

  // Chart data: 0 to max(currentRequests * 5, breakeven * 2)
  const maxX = Math.max(
    inputs.dailyRequests * 5,
    finalBreakeven ? finalBreakeven * 2 : inputs.dailyRequests * 10,
  )

  const steps = 50
  const chartData: IBreakevenChartPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const dailyReqs = Math.round((maxX / steps) * i)
    const apiCostAtScale = costPerRequest * dailyReqs * monthlyDays
    chartData.push({
      dailyRequests: dailyReqs,
      apiCost: Math.round(apiCostAtScale * 100) / 100,
      selfHostedCost: Math.round(selfHostedMonthlyCost * 100) / 100,
    })
  }

  return {
    selfHostedMonthlyCost,
    apiMonthlyCost,
    breakevenDailyRequests: finalBreakeven,
    chartData,
  }
}

export function calculateRouting(options: {
  readonly models: readonly IModel[]
  readonly ratios: readonly number[]
  readonly inputs: ISimulatorInputs
  readonly apiCostInputs: IApiCostInputs
}): IRoutingResult {
  const { models, ratios, inputs, apiCostInputs } = options

  const modelCosts = models.map((model) =>
    calculateApiCost(model, inputs, apiCostInputs),
  )

  const baselineMonthlyCost = Math.max(...modelCosts.map((c) => c.totalMonthlyCost))

  const perModelCosts = models.map((model, i) => ({
    modelName: model.name,
    ratio: ratios[i],
    cost: modelCosts[i].totalMonthlyCost * ratios[i],
  }))

  const routedMonthlyCost = perModelCosts.reduce((sum, c) => sum + c.cost, 0)

  const savingsRate = baselineMonthlyCost > 0
    ? Math.round(((baselineMonthlyCost - routedMonthlyCost) / baselineMonthlyCost) * 10000) / 100
    : 0

  return {
    routedMonthlyCost: Math.round(routedMonthlyCost * 100) / 100,
    baselineMonthlyCost: Math.round(baselineMonthlyCost * 100) / 100,
    savingsRate,
    perModelCosts,
  }
}
