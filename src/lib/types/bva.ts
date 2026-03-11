export type BvaDimensionKey =
  | 'reasoning' | 'korean' | 'coding' | 'knowledge'
  | 'reliability' | 'toolUse' | 'instruction' | 'longContext'

export interface IBvaFormulaEntry {
  readonly benchmark: string
  readonly weight: number
}

export interface IBvaDimension {
  readonly key: BvaDimensionKey
  readonly displayName: string
  readonly description: string
  readonly formula: readonly IBvaFormulaEntry[]
  readonly formulaExplanation: string
}

export interface IRefBenchmark {
  readonly _id: string
  readonly name: string
  readonly displayName: string
  readonly category: string
  readonly maxScore: number
  readonly description: string
  readonly source: string
  readonly url?: string
}

export type BvaVolumeTier = 'under-10k' | '10k-100k' | '100k-1m' | 'over-1m'
export type BvaTone = 'formal' | 'casual' | 'technical'
export type BvaSupportedLanguage = 'ko' | 'en' | 'ja' | 'zh'

export interface IBvaSecurityRequirements {
  readonly onPremiseRequired: boolean
  readonly personalDataHandling: boolean
  readonly regulatedIndustry: boolean
}

export interface IBvaCustomerProfile {
  readonly industry: string
  readonly taskTypes: readonly string[]
  readonly monthlyVolume: BvaVolumeTier
  readonly languages: readonly BvaSupportedLanguage[]
  readonly tone: BvaTone
  readonly security: IBvaSecurityRequirements
}

export interface IBvaComplianceRequirements {
  readonly soc2: boolean
  readonly hipaa: boolean
  readonly gdpr: boolean
  readonly onPremise: boolean
  readonly dataExclusion: boolean
}

export interface IBvaDimensionScore {
  readonly key: BvaDimensionKey
  readonly displayName: string
  readonly score: number | null
  readonly benchmarkDetails: readonly {
    readonly benchmark: string
    readonly benchmarkName: string
    readonly score: number | null
    readonly weight: number
  }[]
}

export interface IBvaComplianceCheck {
  readonly requirement: string
  readonly displayName: string
  readonly met: boolean
}

export interface IBvaCostEstimate {
  readonly monthlyTokens: number
  readonly monthlyCost: number
  readonly costPerRequest: number
  readonly currency: 'USD'
}

export interface IBvaRankedModel {
  readonly slug: string
  readonly name: string
  readonly provider: string
  readonly type: 'commercial' | 'open-source'
  readonly totalScore: number
  readonly dimensionScores: readonly IBvaDimensionScore[]
  readonly costScore: number
  readonly costEstimate: IBvaCostEstimate | null
  readonly complianceChecks: readonly IBvaComplianceCheck[]
  readonly infra: {
    readonly parameterSize: number | null
    readonly activeParameters: number | null
    readonly architecture: 'dense' | 'moe' | null
    readonly contextWindow: number
    readonly license: string
    readonly minGpu: string | null
    readonly vramInt4: number | null
    readonly estimatedTps: number | null
  } | null
}

export interface IBvaReport {
  readonly profile: IBvaCustomerProfile
  readonly commercial: readonly IBvaRankedModel[]
  readonly openSource: readonly IBvaRankedModel[]
  readonly generatedAt: string
}
