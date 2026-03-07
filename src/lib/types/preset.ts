export interface IPresetWeights {
  readonly quality: number
  readonly speed: number
  readonly reasoning: number
  readonly coding: number
  readonly multimodal: number
  readonly cost: number
  readonly korean: number
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

export interface IRankedModel {
  readonly slug: string
  readonly name: string
  readonly provider: string
  readonly score: number
  readonly breakdown: Record<string, number>
}
