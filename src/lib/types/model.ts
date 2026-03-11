export interface IModelPricing {
  readonly input: number
  readonly output: number
  readonly cachingDiscount: number
  readonly batchDiscount: number
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

export type BenchmarkKey =
  | 'mmlu' | 'gpqa' | 'swe_bench' | 'aime' | 'hle' | 'mgsm'
  | 'kmmlu'

export type ModelType = 'commercial' | 'open-source'
export type ModelTier = 'flagship' | 'mid' | 'small' | 'mini' | 'micro'
export type ModelArchitecture = 'dense' | 'moe'

export interface IModel {
  readonly _id?: string
  readonly name: string
  readonly slug: string
  readonly provider: string
  readonly type: ModelType
  readonly tier: ModelTier
  readonly parameterSize: number | null
  readonly activeParameters: number | null
  readonly architecture: ModelArchitecture
  readonly contextWindow: number
  readonly maxOutput: number
  readonly license: string
  readonly pricing: IModelPricing
  readonly compliance: IModelCompliance
  readonly languageScores: Record<string, number>
  readonly benchmarks: Partial<Record<BenchmarkKey, number | null>>
  readonly infrastructure: IModelInfrastructure | null
  readonly releaseDate: string
  readonly memo: string
  readonly sourceUrls: readonly string[]
  readonly colorCode: string
  readonly lastVerifiedAt: string
  readonly isRecentlyReleased?: boolean
}

export interface IModelListQuery {
  readonly type?: ModelType
  readonly provider?: string
  readonly tier?: string
  readonly minPrice?: number
  readonly maxPrice?: number
  readonly search?: string
  readonly sort?: string
  readonly order?: 'asc' | 'desc'
  readonly page?: number
  readonly limit?: number
}
