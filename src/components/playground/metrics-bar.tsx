import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MetricsBarProps {
  readonly metrics: IPlaygroundMessageMetrics
  readonly isFastest?: {
    readonly contentTtft: boolean
    readonly contentTps: boolean
  }
}

export function MetricsBar({ metrics, isFastest }: MetricsBarProps) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 px-2 py-1 text-xs text-muted-foreground">
      {metrics.reasoningTtft !== null && (
        <span className="border-l-2 border-purple-500 pl-1">
          R: {metrics.reasoningTtft}ms | {metrics.reasoningTps} tps | {metrics.reasoningTokens}t
        </span>
      )}
      <span
        className={`border-l-2 border-blue-500 pl-1 ${
          isFastest?.contentTtft || isFastest?.contentTps ? 'font-semibold text-green-600' : ''
        }`}
      >
        C: {metrics.contentTtft}ms
        {isFastest?.contentTtft && ' *'}
        {' | '}{metrics.contentTps} tps
        {isFastest?.contentTps && ' *'}
        {' | '}{metrics.contentTokens}t
      </span>
      <span>
        {(metrics.totalTime / 1000).toFixed(1)}s | {metrics.inputTokens}+
        {metrics.reasoningTokens + metrics.contentTokens}t | ${metrics.estimatedCost.toFixed(4)}
      </span>
    </div>
  )
}
