'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react'
import { MetricsBar } from '@/components/playground/metrics-bar'
import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MessageBubbleProps {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly reasoning?: string
  readonly isStreaming?: boolean
  readonly isReasoningPhase?: boolean
  readonly metrics?: IPlaygroundMessageMetrics
  readonly isFastest?: { readonly ttft: boolean; readonly tps: boolean }
}

export function MessageBubble({
  role,
  content,
  reasoning,
  isStreaming,
  isReasoningPhase,
  metrics,
  isFastest,
}: MessageBubbleProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false)

  return (
    <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'}`}>
      {role === 'assistant' && reasoning && (
        <div className="mb-1 w-full max-w-full">
          <button
            onClick={() => setReasoningOpen((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {reasoningOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <BrainCircuit className="h-3 w-3" />
            <span>생각 중{isReasoningPhase && !content ? '...' : ` (${reasoning.length}자)`}</span>
          </button>
          {reasoningOpen && (
            <div className="mt-1 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {reasoning}
              {isReasoningPhase && (
                <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-muted-foreground" />
              )}
            </div>
          )}
        </div>
      )}

      {(content || (!reasoning && !isStreaming)) && (
        <div
          className={`max-w-full rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
            role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {content}
          {isStreaming && !isReasoningPhase && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current" />
          )}
        </div>
      )}

      {isStreaming && isReasoningPhase && !content && !reasoningOpen && (
        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <BrainCircuit className="h-4 w-4 animate-pulse" />
          <span>생각 중...</span>
        </div>
      )}

      {metrics && <MetricsBar metrics={metrics} isFastest={isFastest} />}
    </div>
  )
}
