// src/lib/types/evaluation.ts

export interface IEvaluationModelConfig {
  readonly modelId: string
  readonly slug: string
  readonly openRouterModelId: string
  readonly modelName: string
  readonly provider: string
  readonly parameters: {
    readonly temperature: number
    readonly maxTokens: number
  }
}

export type EvaluatorName = 'correctness' | 'relevance' | 'hallucination'

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface IEvaluationConfig {
  readonly models: readonly IEvaluationModelConfig[]
  readonly evaluators: readonly EvaluatorName[]
  readonly systemPrompt?: string
  readonly phoenixDatasetId?: string
}

export interface IEvaluationDatasetInfo {
  readonly fileName: string
  readonly rowCount: number
  readonly columns: readonly string[]
}

export interface IEvaluationScore {
  readonly score: number
  readonly label: string
  readonly explanation: string
}

export interface IEvaluationRowResult {
  readonly rowIndex: number
  readonly question: string
  readonly groundTruth: string
  readonly modelResponse: string
  readonly evaluations: Partial<Record<EvaluatorName, IEvaluationScore>>
  readonly latencyMs: number
  readonly tokenCount: {
    readonly input: number
    readonly output: number
  }
}

export interface IExperimentMetrics {
  readonly avgLatencyMs: number
  readonly totalTokens: {
    readonly input: number
    readonly output: number
  }
  readonly estimatedCost: number
}

export interface IExperimentResult {
  readonly modelSlug: string
  readonly phoenixExperimentId: string
  readonly status: EvaluationStatus
  readonly scores: Partial<Record<EvaluatorName, number>>
  readonly results: readonly IEvaluationRowResult[]
  readonly metrics: IExperimentMetrics
}

export interface IEvaluationSession {
  readonly _id?: string
  readonly name: string
  readonly status: EvaluationStatus
  readonly config: IEvaluationConfig
  readonly dataset: IEvaluationDatasetInfo
  readonly experiments: readonly IExperimentResult[]
  readonly createdAt?: string
  readonly startedAt?: string
  readonly completedAt?: string
}

export interface IEvaluationSessionSummary {
  readonly _id: string
  readonly name: string
  readonly status: EvaluationStatus
  readonly dataset: IEvaluationDatasetInfo
  readonly modelCount: number
  readonly createdAt: string
}

export interface IEvaluationUploadResponse {
  readonly columns: readonly string[]
  readonly rowCount: number
  readonly preview: readonly Record<string, string>[]
  readonly rows: readonly Record<string, string>[]
}

export interface IEvaluationRunRequest {
  readonly name: string
  readonly rows: readonly Record<string, string>[]
  readonly fileName: string
  readonly columns: readonly string[]
  readonly models: readonly IEvaluationModelConfig[]
  readonly evaluators: readonly EvaluatorName[]
  readonly systemPrompt?: string
  readonly parameters?: {
    readonly temperature?: number
    readonly maxTokens?: number
  }
}

export interface IEvaluationProgress {
  readonly status: EvaluationStatus
  readonly progress: {
    readonly completed: number
    readonly total: number
  }
  readonly experiments: readonly {
    readonly modelSlug: string
    readonly status: EvaluationStatus
  }[]
}
