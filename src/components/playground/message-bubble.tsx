import { MetricsBar } from '@/components/playground/metrics-bar'
import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MessageBubbleProps {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly isStreaming?: boolean
  readonly metrics?: IPlaygroundMessageMetrics
  readonly isFastest?: { readonly ttft: boolean; readonly tps: boolean }
}

export function MessageBubble({
  role,
  content,
  isStreaming,
  metrics,
  isFastest,
}: MessageBubbleProps) {
  return (
    <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-full rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current" />
        )}
      </div>
      {metrics && <MetricsBar metrics={metrics} isFastest={isFastest} />}
    </div>
  )
}
