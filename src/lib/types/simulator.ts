import type { IModel } from './model'
import type { IGpuReference } from './gpu'

export interface ISimulatorInputs {
  readonly dailyRequests: number
  readonly avgInputTokens: number
  readonly avgOutputTokens: number
  readonly monthlyDays: number
}

export interface IApiCostInputs {
  readonly cacheRate: number    // 0-1
  readonly batchRate: number    // 0-1
}

export interface IBreakevenInputs {
  readonly gpu: IGpuReference | null
  readonly hourlyRate: number
  readonly gpuCount: number
  readonly dailyHours: number
  readonly monthlyOverhead: number
}

export interface IRoutingConfig {
  readonly modelId: string
  readonly ratio: number       // 0-1, sum = 1
}

export interface IModelCostBreakdown {
  readonly model: IModel
  readonly realtimeInputCost: number
  readonly cachedInputCost: number
  readonly batchInputCost: number
  readonly batchCachedInputCost: number
  readonly realtimeOutputCost: number
  readonly batchOutputCost: number
  readonly totalMonthlyCost: number
  readonly totalAnnualCost: number
}

export interface IBreakevenResult {
  readonly selfHostedMonthlyCost: number
  readonly apiMonthlyCost: number
  readonly breakevenDailyRequests: number | null  // null = never crosses
  readonly chartData: readonly IBreakevenChartPoint[]
}

export interface IBreakevenChartPoint {
  readonly dailyRequests: number
  readonly apiCost: number
  readonly selfHostedCost: number
}

export interface IRoutingResult {
  readonly routedMonthlyCost: number
  readonly baselineMonthlyCost: number
  readonly savingsRate: number
  readonly perModelCosts: readonly {
    readonly modelName: string
    readonly ratio: number
    readonly cost: number
  }[]
}
