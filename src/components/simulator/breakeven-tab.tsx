'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BreakevenLineChart } from './breakeven-line-chart'
import { calculateBreakeven } from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { IGpuReference } from '@/lib/types/gpu'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

interface BreakevenTabProps {
  readonly models: readonly IModel[]
  readonly inputs: ISimulatorInputs
  readonly apiInputs: IApiCostInputs
}

function formatCost(cost: number): string {
  return `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BreakevenTab({ models, inputs, apiInputs }: BreakevenTabProps) {
  const [gpus, setGpus] = useState<readonly IGpuReference[]>([])
  const [selectedGpuSlug, setSelectedGpuSlug] = useState<string>('')
  const [hourlyRate, setHourlyRate] = useState(2.0)
  const [gpuCount, setGpuCount] = useState(1)
  const [dailyHours, setDailyHours] = useState(24)
  const [monthlyOverhead, setMonthlyOverhead] = useState(0)

  const ossModels = models.filter((m) => m.type === 'open-source')
  const commercialModels = models.filter((m) => m.type === 'commercial')

  useEffect(() => {
    async function fetchGpus() {
      const res = await fetch('/api/gpu')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) setGpus(json.data)
    }
    fetchGpus()
  }, [])

  const selectedGpu = gpus.find((g) => g.slug === selectedGpuSlug)

  // Auto-set hourly rate when GPU changes
  useEffect(() => {
    if (selectedGpu) setHourlyRate(selectedGpu.cloudHourly)
  }, [selectedGpu])

  // Auto-calculate GPU count from OSS model VRAM / selected GPU VRAM
  useEffect(() => {
    if (!selectedGpu || ossModels.length === 0) return
    const maxVram = Math.max(...ossModels.map((m) => m.infrastructure?.vramFp16 ?? 0))
    if (maxVram > 0 && selectedGpu.vram > 0) {
      setGpuCount(Math.ceil(maxVram / selectedGpu.vram))
    }
  }, [selectedGpu, ossModels])

  // Compare against each commercial model (or fallback to first model)
  const comparisonModels = commercialModels.length > 0 ? commercialModels : [models[0]].filter(Boolean)

  const result = useMemo(() => {
    const cm = comparisonModels[0]
    if (!cm) return null
    return calculateBreakeven({
      commercialModel: cm,
      inputs,
      apiCostInputs: apiInputs,
      hourlyRate,
      gpuCount,
      dailyHours,
      monthlyDays: inputs.monthlyDays,
      monthlyOverhead,
    })
  }, [comparisonModels, inputs, apiInputs, hourlyRate, gpuCount, dailyHours, monthlyOverhead])

  if (ossModels.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          OSS 모델을 선택하면 셀프호스팅 비용을 비교할 수 있습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>GPU 모델</Label>
              <Select value={selectedGpuSlug} onValueChange={setSelectedGpuSlug}>
                <SelectTrigger><SelectValue placeholder="GPU 선택" /></SelectTrigger>
                <SelectContent>
                  {gpus.map((gpu) => (
                    <SelectItem key={gpu.slug} value={gpu.slug}>
                      {gpu.name} ({gpu.vram}GB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>시간당 임대 단가</Label>
              <Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>GPU 수량</Label>
              <Input type="number" min={1} max={64} value={gpuCount} onChange={(e) => setGpuCount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>일 가동시간</Label>
              <Input type="number" min={1} max={24} value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>월 부대비용 ($)</Label>
              <Input type="number" min={0} value={monthlyOverhead} onChange={(e) => setMonthlyOverhead(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">API 월간 비용</p>
                <p className="text-2xl font-bold text-blue-600">{formatCost(result.apiMonthlyCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">{comparisonModels[0]?.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">셀프호스팅 월간 비용</p>
                <p className="text-2xl font-bold text-orange-600">{formatCost(result.selfHostedMonthlyCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">손익분기점</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.breakevenDailyRequests !== null
                    ? `일 ${result.breakevenDailyRequests.toLocaleString()}건`
                    : '해당 없음'}
                </p>
                {result.breakevenDailyRequests !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    이 이상이면 셀프호스팅이 유리
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <BreakevenLineChart
            chartData={result.chartData}
            breakevenPoint={result.breakevenDailyRequests}
          />

          {ossModels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OSS 모델 인프라 요구사항</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ossModels.map((m) => (
                    <div key={m.slug} className="space-y-1">
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        VRAM: {m.infrastructure?.vramFp16 ?? 'N/A'}GB
                        {m.infrastructure?.minGpu && ` | 권장 GPU: ${m.infrastructure.minGpu}`}
                        {m.parameterSize && ` | ${m.parameterSize}B params`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
