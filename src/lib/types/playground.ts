export interface IPlaygroundMessageMetrics {
  readonly reasoningTtft: number | null
  readonly reasoningTps: number | null
  readonly reasoningTokens: number
  readonly contentTtft: number
  readonly contentTps: number
  readonly contentTokens: number
  readonly totalTime: number
  readonly inputTokens: number
  readonly estimatedCost: number
}

export interface IPlaygroundMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly reasoning?: string
  readonly modelId?: string
  readonly metrics?: IPlaygroundMessageMetrics
  readonly createdAt?: string
}

export interface IPlaygroundModelConfig {
  readonly modelId: string
  readonly modelName?: string
  readonly provider?: string
  readonly openRouterModelId?: string
  readonly colorCode?: string
  readonly parameters: IPlaygroundParameters
}

export type ReasoningEffort = 'low' | 'medium' | 'high'

export interface IPlaygroundParameters {
  readonly temperature: number
  readonly maxTokens: number
  readonly topP: number
  readonly reasoningEffort: ReasoningEffort
}

export const DEFAULT_PARAMETERS: IPlaygroundParameters = {
  temperature: 0.7,
  maxTokens: 16384,
  topP: 1.0,
  reasoningEffort: 'low',
}

export interface IPlaygroundSession {
  readonly _id?: string
  readonly title: string
  readonly models: readonly IPlaygroundModelConfig[]
  readonly systemPrompt: string
  readonly messages: readonly IPlaygroundMessage[]
  readonly defaultParameters: IPlaygroundParameters
  readonly createdAt?: string
  readonly updatedAt?: string
}

export interface IPlaygroundSessionSummary {
  readonly _id: string
  readonly title: string
  readonly models: readonly {
    readonly modelName?: string
    readonly provider?: string
  }[]
  readonly messageCount: number
  readonly createdAt: string
}

export interface IPlaygroundChatRequest {
  readonly sessionId: string
  readonly modelId: string
  readonly openRouterModelId: string
  readonly messages: readonly {
    readonly role: 'system' | 'user' | 'assistant'
    readonly content: string
  }[]
  readonly parameters: IPlaygroundParameters
}

export interface IPlaygroundChatStreamEvent {
  readonly type: 'token' | 'reasoning' | 'done' | 'error'
  readonly content?: string
  readonly usage?: {
    readonly promptTokens: number
    readonly completionTokens: number
    readonly reasoningTokens?: number
  }
  readonly error?: string
}
