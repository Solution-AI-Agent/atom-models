'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CostBarChart } from './cost-bar-chart'
import { calculateApiCost } from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs, IModelCostBreakdown } from '@/lib/types/simulator'

interface ApiCostTabProps {
  readonly models: readonly IModel[]
  readonly inputs: ISimulatorInputs
  readonly apiInputs: IApiCostInputs
  readonly onApiInputsChange: (inputs: IApiCostInputs) => void
}

function formatCost(cost: number): string {
  return `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ApiCostTab({ models, inputs, apiInputs, onApiInputsChange }: ApiCostTabProps) {
  const breakdowns: readonly IModelCostBreakdown[] = useMemo(
    () => models.map((m) => calculateApiCost(m, inputs, apiInputs)),
    [models, inputs, apiInputs],
  )

  const cheapestIdx = breakdowns.reduce(
    (minIdx, b, i) => (b.totalMonthlyCost < breakdowns[minIdx].totalMonthlyCost ? i : minIdx),
    0,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label>프롬프트 캐싱 적용률: {Math.round(apiInputs.cacheRate * 100)}%</Label>
              <Slider
                value={[apiInputs.cacheRate * 100]}
                onValueChange={([v]) => onApiInputsChange({ ...apiInputs, cacheRate: v / 100 })}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-3">
              <Label>Batch API 활용 비율: {Math.round(apiInputs.batchRate * 100)}%</Label>
              <Slider
                value={[apiInputs.batchRate * 100]}
                onValueChange={([v]) => onApiInputsChange({ ...apiInputs, batchRate: v / 100 })}
                max={100}
                step={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <CostBarChart breakdowns={breakdowns} mode="monthly" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">비용 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>모델</TableHead>
                  <TableHead className="text-right">Input (실시간)</TableHead>
                  <TableHead className="text-right">Input (캐시)</TableHead>
                  <TableHead className="text-right">Input (배치)</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">월간 합계</TableHead>
                  <TableHead className="text-right">연간 합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdowns.map((b, i) => (
                  <TableRow key={b.model.slug}>
                    <TableCell className="font-medium">
                      {b.model.name}
                      {i === cheapestIdx && breakdowns.length > 1 && (
                        <Badge variant="secondary" className="ml-2 text-xs">최저</Badge>
                      )}
                      {b.model.type === 'open-source' && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (셀프호스팅 비용은 손익분기점 탭에서 확인)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCost(b.realtimeInputCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.cachedInputCost + b.batchCachedInputCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.batchInputCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.realtimeOutputCost + b.batchOutputCost)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCost(b.totalMonthlyCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.totalAnnualCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        {models.length === 1 ? (
          <Link href={`/explore/${models[0].slug}`} className="text-primary hover:underline">
            이 모델의 성능 분석 보기
          </Link>
        ) : (
          <Link href="/bva" className="text-primary hover:underline">
            BVA 성능 분석 보기
          </Link>
        )}
      </div>
    </div>
  )
}
