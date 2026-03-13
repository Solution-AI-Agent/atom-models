import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EvaluatorName, IExperimentResult } from '@/lib/types/evaluation'

const EVALUATOR_LABELS: Record<EvaluatorName, string> = {
  correctness: 'Correctness',
  relevance: 'Relevance',
  hallucination: 'Hallucination',
}

interface ScoreSummaryCardProps {
  readonly experiment: IExperimentResult
  readonly isBest: boolean
}

export function ScoreSummaryCard({ experiment, isBest }: ScoreSummaryCardProps) {
  const evaluatorEntries = Object.entries(experiment.scores) as [EvaluatorName, number][]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{experiment.modelSlug}</CardTitle>
          {isBest && <Badge variant="default">Best</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {evaluatorEntries.map(([name, score]) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {EVALUATOR_LABELS[name] ?? name}
              </span>
              <span className="text-sm font-medium">
                {Math.round(score * 100)}%
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t pt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>평균 지연</span>
            <span>{Math.round(experiment.metrics.avgLatencyMs)}ms</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>예상 비용</span>
            <span>${experiment.metrics.estimatedCost.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>총 토큰</span>
            <span>
              {(experiment.metrics.totalTokens.input + experiment.metrics.totalTokens.output).toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
