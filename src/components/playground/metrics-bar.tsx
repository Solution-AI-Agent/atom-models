import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MetricsBarProps {
  readonly metrics: IPlaygroundMessageMetrics
  readonly isFastest?: {
    readonly ttft: boolean
    readonly tps: boolean
  }
}

export function MetricsBar({ metrics, isFastest }: MetricsBarProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 py-1 text-xs text-muted-foreground">
      <span className={isFastest?.ttft ? 'font-semibold text-green-600' : ''}>
        TTFT {metrics.ttft}ms
      </span>
      <span>
        총 {(metrics.totalTime / 1000).toFixed(1)}s
      </span>
      <span className={isFastest?.tps ? 'font-semibold text-green-600' : ''}>
        {metrics.tps} tps
      </span>
      <span>
        {metrics.inputTokens}+{metrics.outputTokens} tokens
      </span>
      <span>
        ${metrics.estimatedCost.toFixed(4)}
      </span>
    </div>
  )
}
