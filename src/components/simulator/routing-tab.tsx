'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { RoutingStackedChart } from './routing-stacked-chart'
import { calculateRouting } from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

interface RoutingTabProps {
  readonly models: readonly IModel[]
  readonly inputs: ISimulatorInputs
  readonly apiInputs: IApiCostInputs
  readonly ratios: readonly number[]
  readonly onRatiosChange: (ratios: readonly number[]) => void
}

function formatCost(cost: number): string {
  return `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function RoutingTab({ models, inputs, apiInputs, ratios, onRatiosChange }: RoutingTabProps) {
  const result = useMemo(
    () => calculateRouting({ models, ratios, inputs, apiCostInputs: apiInputs }),
    [models, ratios, inputs, apiInputs],
  )

  if (models.length < 2) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          2개 이상 모델을 선택하면 라우팅 시뮬레이션을 할 수 있습니다.
        </CardContent>
      </Card>
    )
  }

  const handleRatioChange = (index: number, newValue: number) => {
    const newRatio = newValue / 100
    const oldRatio = ratios[index]
    const diff = newRatio - oldRatio

    // Distribute the difference proportionally among other models
    const otherTotal = ratios.reduce((sum, r, i) => (i === index ? sum : sum + r), 0)
    const newRatios = ratios.map((r, i) => {
      if (i === index) return newRatio
      if (otherTotal === 0) return (1 - newRatio) / (ratios.length - 1)
      return Math.max(0, r - (diff * r) / otherTotal)
    })

    // Normalize to exactly 1.0
    const total = newRatios.reduce((sum, r) => sum + r, 0)
    onRatiosChange(newRatios.map((r) => Math.round((r / total) * 100) / 100))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">트래픽 비율 조절</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model, i) => (
              <div key={model.slug} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{model.name}</Label>
                  <span className="text-sm font-medium">{Math.round(ratios[i] * 100)}%</span>
                </div>
                <Slider
                  value={[Math.round(ratios[i] * 100)]}
                  onValueChange={(v) => handleRatioChange(i, Array.isArray(v) ? v[0] : v)}
                  max={100}
                  step={5}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">단일 모델 (최고가)</p>
            <p className="text-2xl font-bold">{formatCost(result.baselineMonthlyCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">라우팅 적용</p>
            <p className="text-2xl font-bold text-blue-600">{formatCost(result.routedMonthlyCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">절감률</p>
            <Badge variant={result.savingsRate > 0 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
              {result.savingsRate}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      <RoutingStackedChart result={result} />
    </div>
  )
}
