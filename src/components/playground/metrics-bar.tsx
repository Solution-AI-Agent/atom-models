'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MetricsBarProps {
  readonly metrics: IPlaygroundMessageMetrics
  readonly isFastest?: {
    readonly contentTtft: boolean
    readonly contentTps: boolean
  }
}

export function MetricsBar({ metrics, isFastest }: MetricsBarProps) {
  const [open, setOpen] = useState(false)

  const totalTokens = metrics.reasoningTokens + metrics.contentTokens

  return (
    <div className="mt-1 text-xs text-muted-foreground">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>
          총 {(metrics.totalTime / 1000).toFixed(1)}초 | {metrics.inputTokens}+{totalTokens} 토큰 | ${metrics.estimatedCost.toFixed(4)}
        </span>
      </button>

      {open && (
        <div className="mt-1 space-y-0.5 rounded-md border border-muted px-2 py-1.5">
          {metrics.reasoningTtft !== null && (
            <>
              <div className="border-l-2 border-purple-500 pl-2">
                추론 첫 토큰: {metrics.reasoningTtft}ms
              </div>
              <div className="border-l-2 border-purple-500 pl-2">
                추론 속도: {metrics.reasoningTps} 토큰/초
              </div>
              <div className="border-l-2 border-purple-500 pl-2">
                추론 토큰: {metrics.reasoningTokens}개
              </div>
            </>
          )}
          <div className={`border-l-2 border-blue-500 pl-2 ${isFastest?.contentTtft ? 'font-semibold text-green-600' : ''}`}>
            답변 첫 토큰: {metrics.contentTtft}ms{isFastest?.contentTtft && ' (최빠름)'}
          </div>
          <div className={`border-l-2 border-blue-500 pl-2 ${isFastest?.contentTps ? 'font-semibold text-green-600' : ''}`}>
            답변 속도: {metrics.contentTps} 토큰/초{isFastest?.contentTps && ' (최빠름)'}
          </div>
          <div className="border-l-2 border-blue-500 pl-2">
            답변 토큰: {metrics.contentTokens}개
          </div>
          <div className="border-l-2 border-muted-foreground/30 pl-2">
            총 소요: {(metrics.totalTime / 1000).toFixed(1)}초
          </div>
          <div className="border-l-2 border-muted-foreground/30 pl-2">
            입력 토큰: {metrics.inputTokens}개
          </div>
          <div className="border-l-2 border-muted-foreground/30 pl-2">
            예상 비용: ${metrics.estimatedCost.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  )
}
