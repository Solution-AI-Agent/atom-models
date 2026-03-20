import type { IPlaygroundMessageMetrics, IPlaygroundParameters } from './playground'

export type WorkerInboundMessage =
  | {
      readonly type: 'start'
      readonly apiBaseUrl: string
      readonly modelId: string
      readonly openRouterModelId: string
      readonly messages: readonly {
        readonly role: 'system' | 'user' | 'assistant'
        readonly content: string
      }[]
      readonly parameters: IPlaygroundParameters
      readonly pricing: {
        readonly inputPer1m: number | null
        readonly outputPer1m: number | null
      }
    }
  | { readonly type: 'abort' }

export type WorkerOutboundMessage =
  | { readonly type: 'reasoning'; readonly content: string }
  | { readonly type: 'token'; readonly content: string }
  | {
      readonly type: 'done'
      readonly content: string
      readonly reasoning: string
      readonly metrics: IPlaygroundMessageMetrics
    }
  | { readonly type: 'error'; readonly error: string }

export function isWorkerTokenMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'token' }> {
  return msg.type === 'token'
}

export function isWorkerReasoningMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'reasoning' }> {
  return msg.type === 'reasoning'
}

export function isWorkerDoneMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'done' }> {
  return msg.type === 'done'
}

export function isWorkerErrorMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'error' }> {
  return msg.type === 'error'
}
