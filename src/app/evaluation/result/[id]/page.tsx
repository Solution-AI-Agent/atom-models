export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionStatusBadge } from '@/components/evaluation/session-status-badge'
import { EvaluationProgress } from '@/components/evaluation/evaluation-progress'
import { ScoreSummaryCard } from '@/components/evaluation/score-summary-card'
import { ScoreComparisonChart } from '@/components/evaluation/score-comparison-chart'
import { EvaluationResultTable } from '@/components/evaluation/evaluation-result-table'
import { getEvaluationSessionById } from '@/lib/services/evaluation.service'
import type { IExperimentResult } from '@/lib/types/evaluation'

function findBestModel(experiments: readonly IExperimentResult[]): string | null {
  if (experiments.length === 0) return null

  let bestSlug: string | null = null
  let bestAvg = -1

  for (const exp of experiments) {
    const scores = Object.values(exp.scores).filter((s): s is number => s != null)
    if (scores.length === 0) continue
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
    if (avg > bestAvg) {
      bestAvg = avg
      bestSlug = exp.modelSlug
    }
  }

  return bestSlug
}

export default async function EvaluationResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getEvaluationSessionById(id)

  if (!session) {
    notFound()
  }

  const completedExperiments = session.experiments.filter((e) => e.status === 'completed')
  const bestModelSlug = findBestModel(completedExperiments)
  const isInProgress = session.status === 'pending' || session.status === 'running'

  const phoenixExperimentId = session.experiments.find(
    (e) => e.phoenixExperimentId,
  )?.phoenixExperimentId

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Link href="/evaluation">
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            평가
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{session.dataset.rowCount}행</span>
              <span>{session.experiments.length}개 모델</span>
              <SessionStatusBadge status={session.status} />
            </div>
          </div>
          {phoenixExperimentId && (
            <a
              href={`${process.env.PHOENIX_URL ?? 'http://localhost:6006'}/experiments`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                Phoenix Dashboard
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Progress section */}
      {isInProgress && (
        <EvaluationProgress
          progress={{
            status: session.status,
            progress: {
              completed: session.experiments.filter((e) => e.status === 'completed').length,
              total: session.experiments.length,
            },
            experiments: session.experiments.map((e) => ({
              modelSlug: e.modelSlug,
              status: e.status,
            })),
          }}
        />
      )}

      {/* Score cards */}
      {completedExperiments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completedExperiments.map((exp) => (
            <ScoreSummaryCard
              key={exp.modelSlug}
              experiment={exp}
              isBest={exp.modelSlug === bestModelSlug}
            />
          ))}
        </div>
      )}

      {/* Score comparison chart */}
      {completedExperiments.length > 1 && (
        <ScoreComparisonChart experiments={completedExperiments} />
      )}

      {/* Individual results table */}
      {completedExperiments.length > 0 && (
        <EvaluationResultTable experiments={completedExperiments} />
      )}
    </div>
  )
}
