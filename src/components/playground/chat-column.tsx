'use client'

import { useRef, useEffect, useState } from 'react'
import { Settings2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageBubble } from '@/components/playground/message-bubble'
import { ParameterPanel } from '@/components/playground/parameter-panel'
import type { IPlaygroundMessage, IPlaygroundParameters } from '@/lib/types/playground'

interface ChatColumnProps {
  readonly modelName: string
  readonly provider: string
  readonly colorCode: string
  readonly messages: readonly IPlaygroundMessage[]
  readonly streamingContent: string
  readonly streamingReasoning: string
  readonly isStreaming: boolean
  readonly error: string | null
  readonly parameters: IPlaygroundParameters
  readonly onParametersChange: (params: IPlaygroundParameters) => void
  readonly onStop: () => void
  readonly fastestMetrics?: {
    readonly ttft: string | null
    readonly tps: string | null
  }
  readonly className?: string
}

export function ChatColumn({
  modelName,
  provider,
  colorCode,
  messages,
  streamingContent,
  streamingReasoning,
  isStreaming,
  error,
  parameters,
  onParametersChange,
  onStop,
  fastestMetrics,
  className,
}: ChatColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showParams, setShowParams] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  return (
    <div className={`flex h-full flex-col rounded-lg border ${className || ''}`}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colorCode }}
          />
          <div>
            <p className="text-sm font-medium">{modelName}</p>
            <p className="text-xs text-muted-foreground">{provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isStreaming && (
            <Button variant="ghost" size="sm" onClick={onStop}>
              <Square className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParams(!showParams)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showParams && (
        <div className="border-b p-3">
          <ParameterPanel parameters={parameters} onChange={onParametersChange} />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            reasoning={msg.reasoning}
            metrics={msg.metrics}
            isFastest={
              msg.metrics
                ? {
                    ttft: fastestMetrics?.ttft === msg.modelId,
                    tps: fastestMetrics?.tps === msg.modelId,
                  }
                : undefined
            }
          />
        ))}

        {isStreaming && (streamingContent || streamingReasoning) && (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            reasoning={streamingReasoning}
            isStreaming
            isReasoningPhase={streamingReasoning.length > 0 && streamingContent.length === 0}
          />
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
