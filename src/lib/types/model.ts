export interface IModelPricing {
  readonly inputPer1m: number | null
  readonly outputPer1m: number | null
  readonly pricingType: string
  readonly cachedInputPer1m: number | null
  readonly batchInputPer1m: number | null
  readonly batchOutputPer1m: number | null
}

export interface IModelCompliance {
  readonly soc2: boolean
  readonly hipaa: boolean
  readonly gdpr: boolean
  readonly onPremise: boolean
  readonly dataExclusion: boolean
}

export interface IModelInfrastructure {
  readonly minGpu: string
  readonly vramFp16: number
  readonly vramFp8?: number
  readonly vramInt8: number
  readonly vramInt4: number
  readonly vramQ6k?: number
  readonly vramQ5k?: number
  readonly vramQ4kM?: number
  readonly vramQ3k?: number
  readonly vramQ2k?: number
  readonly recommendedFramework: readonly string[]
  readonly estimatedTps: number
}

export interface IModelCapabilities {
  readonly functionCalling: boolean
  readonly structuredOutput: boolean
  readonly streaming: boolean
  readonly systemPrompt: boolean
  readonly vision: boolean
  readonly toolUse: boolean
  readonly fineTuning: boolean
  readonly batchApi: boolean
  readonly thinkingMode: boolean
}

export type BenchmarkKey =
  | 'mmlu' | 'gpqa' | 'swe_bench' | 'aime' | 'hle' | 'mgsm' | 'kmmlu'
  | 'truthfulqa' | 'bfcl' | 'ifeval' | 'ruler'

export type ModelType = 'commercial' | 'open-source'
export type ModelTier = 'flagship' | 'mid' | 'light'
export type ModelStatus = 'active' | 'preview' | 'deprecated' | 'scheduled-deprecation'
export type ModelArchitecture = 'dense' | 'moe'

export interface IModel {
  readonly _id?: string
  readonly name: string
  readonly slug: string
  readonly providerId: string
  readonly family: string | null
  readonly variant: string | null
  readonly type: ModelType
  readonly tier: ModelTier
  readonly tags: readonly string[]
  readonly releaseDate: string
  readonly license: string
  readonly isOpensource: boolean
  readonly status: ModelStatus
  readonly deprecationDate: string | null
  readonly parameterSize: number | null
  readonly activeParameters: number | null
  readonly architecture: ModelArchitecture
  readonly contextWindow: number
  readonly maxOutput: number
  readonly trainingCutoff: string | null
  readonly languages: readonly string[]
  readonly modalityInput: readonly string[]
  readonly modalityOutput: readonly string[]
  readonly capabilities: IModelCapabilities
  readonly pricing: IModelPricing
  readonly compliance: IModelCompliance
  readonly benchmarks: Partial<Record<BenchmarkKey, number | null>>
  readonly avgTps: number | null
  readonly ttftMs: number | null
  readonly regions: readonly string[] | null
  readonly infrastructure: IModelInfrastructure | null
  readonly openRouterModelId?: string
  readonly memo: string
  readonly sourceUrls: readonly string[]
  readonly lastVerifiedAt: string
  readonly isRecentlyReleased?: boolean
}

export interface IModelListQuery {
  readonly type?: ModelType
  readonly providerId?: string
  readonly tier?: string
  readonly tags?: string
  readonly status?: string
  readonly minPrice?: number
  readonly maxPrice?: number
  readonly search?: string
  readonly sort?: string
  readonly order?: 'asc' | 'desc'
  readonly page?: number
  readonly limit?: number
}
