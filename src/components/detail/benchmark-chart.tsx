'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { BENCHMARKS } from '@/lib/constants/benchmarks'

interface BenchmarkChartProps {
  readonly benchmarks: Record<string, number>
}

export function BenchmarkChart({ benchmarks }: BenchmarkChartProps) {
  const entries = Object.entries(benchmarks)

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>벤치마크</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">벤치마크 데이터가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  const data = entries.map(([key, value]) => {
    const benchmarkInfo = BENCHMARKS[key as keyof typeof BENCHMARKS]
    return {
      name: benchmarkInfo?.label ?? key,
      score: value,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>벤치마크</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis domain={[0, 100]} className="text-xs" />
              <Tooltip />
              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
