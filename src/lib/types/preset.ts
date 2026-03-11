import type { BvaDimensionKey } from './bva'

export interface IPresetWeights {
  readonly reasoning: number
  readonly korean: number
  readonly coding: number
  readonly knowledge: number
  readonly cost: number
}

export interface IPresetRecommendation {
  readonly modelSlug: string
  readonly reason: string
}

export interface IPresetRecommendations {
  readonly commercial: readonly IPresetRecommendation[]
  readonly costEffective: readonly IPresetRecommendation[]
  readonly openSource: readonly IPresetRecommendation[]
}

export interface IIndustryPreset {
  readonly _id?: string
  readonly category: string
  readonly categorySlug: string
  readonly taskType: string
  readonly taskTypeSlug: string
  readonly weights: IPresetWeights
  readonly recommendations: IPresetRecommendations
  readonly description: string
  readonly keyFactors: readonly string[]
}

export interface IRankedModelInfra {
  readonly parameterSize: number | null
  readonly activeParameters: number | null
  readonly architecture: 'dense' | 'moe' | null
  readonly contextWindow: number
  readonly license: string
  readonly minGpu: string | null
  readonly vramInt4: number | null
  readonly estimatedTps: number | null
}

export interface IRankedModel {
  readonly slug: string
  readonly name: string
  readonly provider: string
  readonly type: 'commercial' | 'open-source'
  readonly score: number
  readonly breakdown: Record<BvaDimensionKey | 'cost', number>
  readonly infra: IRankedModelInfra | null
}
