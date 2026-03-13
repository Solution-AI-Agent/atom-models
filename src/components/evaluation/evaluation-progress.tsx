'use client'

import { SessionStatusBadge } from './session-status-badge'
import type { IEvaluationProgress } from '@/lib/types/evaluation'

interface EvaluationProgressProps {
  readonly progress: IEvaluationProgress
}

export function EvaluationProgress({ progress }: EvaluationProgressProps) {
  const { completed, total } = progress.progress
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">진행률</span>
          <span className="text-muted-foreground">
            {completed} / {total} ({percentage}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">모델별 상태</p>
        <div className="flex flex-wrap gap-2">
          {progress.experiments.map((exp) => (
            <div
              key={exp.modelSlug}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5"
            >
              <span className="text-sm">{exp.modelSlug}</span>
              <SessionStatusBadge status={exp.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
