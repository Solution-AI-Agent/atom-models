import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IBvaRankedModel } from '@/lib/types/bva'

interface BvaDimensionComparisonProps {
  readonly models: readonly IBvaRankedModel[]
  readonly title: string
}

function ScoreCell({ score }: { readonly score: number | null }) {
  if (score == null) {
    return <span className="text-muted-foreground">N/A</span>
  }

  const rounded = Math.round(score * 10) / 10

  let colorClass = 'text-muted-foreground'
  if (rounded >= 80) colorClass = 'text-green-600 dark:text-green-400'
  else if (rounded >= 60) colorClass = 'text-blue-600 dark:text-blue-400'
  else if (rounded >= 40) colorClass = 'text-yellow-600 dark:text-yellow-400'

  return <span className={`font-semibold ${colorClass}`}>{rounded}</span>
}

export function BvaDimensionComparison({ models, title }: BvaDimensionComparisonProps) {
  if (models.length === 0) return null

  const dimensions = models[0].dimensionScores

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">평가 차원</TableHead>
                {models.map((model) => (
                  <TableHead key={model.slug} className="text-center min-w-[100px]">
                    <div>
                      <div className="font-semibold">{model.name}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {model.provider}
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dimensions.map((dim) => (
                <TableRow key={dim.key}>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 text-left">
                          <span className="font-medium text-sm">{dim.displayName}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">?</Badge>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            {dim.benchmarkDetails.map((bd) => (
                              <div key={bd.benchmark} className="text-xs">
                                <span className="font-medium">{bd.benchmarkName}</span>
                                <span className="text-muted-foreground">
                                  {' '}({Math.round(bd.weight * 100)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  {models.map((model) => {
                    const modelDim = model.dimensionScores.find((d) => d.key === dim.key)
                    return (
                      <TableCell key={model.slug} className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <ScoreCell score={modelDim?.score ?? null} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                {modelDim?.benchmarkDetails.map((bd) => (
                                  <div key={bd.benchmark} className="text-xs flex justify-between gap-4">
                                    <span>{bd.benchmarkName}</span>
                                    <span className="font-medium">
                                      {bd.score != null ? Math.round(bd.score * 10) / 10 : 'N/A'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <span className="font-medium text-sm">비용 점수</span>
                </TableCell>
                {models.map((model) => (
                  <TableCell key={model.slug} className="text-center">
                    <ScoreCell score={model.costScore} />
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell>
                  <span className="font-bold text-sm">종합 점수</span>
                </TableCell>
                {models.map((model) => (
                  <TableCell key={model.slug} className="text-center">
                    <span className="font-bold text-base">{model.totalScore}</span>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
