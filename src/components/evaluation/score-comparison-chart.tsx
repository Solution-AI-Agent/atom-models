'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EvaluatorName, IExperimentResult } from '@/lib/types/evaluation'

const EVALUATOR_LABELS: Record<EvaluatorName, string> = {
  correctness: 'Correctness',
  relevance: 'Relevance',
  hallucination: 'Hallucination',
}

const MODEL_COLORS = ['#3b82f6', '#f59e0b', '#22c55e'] as const

interface ScoreComparisonChartProps {
  readonly experiments: readonly IExperimentResult[]
}

export function ScoreComparisonChart({ experiments }: ScoreComparisonChartProps) {
  if (experiments.length === 0) {
    return null
  }

  const allEvaluators = new Set<EvaluatorName>()
  for (const exp of experiments) {
    for (const key of Object.keys(exp.scores)) {
      allEvaluators.add(key as EvaluatorName)
    }
  }

  const data = Array.from(allEvaluators).map((evaluator) => {
    const entry: Record<string, string | number> = {
      evaluator: EVALUATOR_LABELS[evaluator] ?? evaluator,
    }
    for (const exp of experiments) {
      const score = exp.scores[evaluator]
      entry[exp.modelSlug] = score != null ? Math.round(score * 100) : 0
    }
    return entry
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>평가 점수 비교</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="evaluator" className="text-xs" />
              <YAxis domain={[0, 100]} className="text-xs" unit="%" />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              {experiments.map((exp, idx) => (
                <Bar
                  key={exp.modelSlug}
                  dataKey={exp.modelSlug}
                  fill={MODEL_COLORS[idx % MODEL_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
