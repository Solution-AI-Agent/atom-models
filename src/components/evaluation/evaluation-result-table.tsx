'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EvaluatorName, IExperimentResult } from '@/lib/types/evaluation'

const EVALUATOR_LABELS: Record<EvaluatorName, string> = {
  correctness: 'Correctness',
  relevance: 'Relevance',
  hallucination: 'Hallucination',
}

interface EvaluationResultTableProps {
  readonly experiments: readonly IExperimentResult[]
}

export function EvaluationResultTable({ experiments }: EvaluationResultTableProps) {
  if (experiments.length === 0) {
    return null
  }

  const allEvaluators = new Set<EvaluatorName>()
  for (const exp of experiments) {
    for (const row of exp.results) {
      for (const key of Object.keys(row.evaluations)) {
        allEvaluators.add(key as EvaluatorName)
      }
    }
  }
  const evaluatorList = Array.from(allEvaluators)

  // Use the first experiment's results as the base rows (all experiments share the same dataset)
  const baseResults = experiments[0].results

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">개별 결과</p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[200px]">질문</TableHead>
              <TableHead className="min-w-[200px]">정답</TableHead>
              {experiments.map((exp) => (
                evaluatorList.map((evaluator) => (
                  <TableHead key={`${exp.modelSlug}-${evaluator}`} className="text-center">
                    {exp.modelSlug}
                    <br />
                    <span className="text-xs font-normal text-muted-foreground">
                      {EVALUATOR_LABELS[evaluator] ?? evaluator}
                    </span>
                  </TableHead>
                ))
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {baseResults.map((baseRow) => (
              <TableRow key={baseRow.rowIndex}>
                <TableCell className="text-muted-foreground">{baseRow.rowIndex + 1}</TableCell>
                <TableCell className="max-w-[300px] truncate">{baseRow.question}</TableCell>
                <TableCell className="max-w-[300px] truncate">{baseRow.groundTruth}</TableCell>
                {experiments.map((exp) => {
                  const row = exp.results.find((r) => r.rowIndex === baseRow.rowIndex)
                  return evaluatorList.map((evaluator) => {
                    const evaluation = row?.evaluations[evaluator]
                    if (!evaluation) {
                      return (
                        <TableCell key={`${exp.modelSlug}-${evaluator}-${baseRow.rowIndex}`} className="text-center">
                          <span className="text-xs text-muted-foreground">-</span>
                        </TableCell>
                      )
                    }
                    const passed = evaluation.score >= 0.5
                    return (
                      <TableCell key={`${exp.modelSlug}-${evaluator}-${baseRow.rowIndex}`} className="text-center">
                        <Badge variant={passed ? 'outline' : 'destructive'}>
                          {passed ? 'Pass' : 'Fail'}
                        </Badge>
                      </TableCell>
                    )
                  })
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
