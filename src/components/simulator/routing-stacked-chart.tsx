'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IRoutingResult } from '@/lib/types/simulator'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea']

interface RoutingStackedChartProps {
  readonly result: IRoutingResult
}

export function RoutingStackedChart({ result }: RoutingStackedChartProps) {
  const data = [
    {
      name: '라우팅 적용',
      ...Object.fromEntries(result.perModelCosts.map((c) => [c.modelName, Math.round(c.cost * 100) / 100])),
    },
    {
      name: '단일 모델 (최고가)',
      _baseline: result.baselineMonthlyCost,
    },
  ]

  const tickFormatter = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis tickFormatter={tickFormatter} className="text-xs" />
        <Tooltip formatter={(value: unknown) => `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Legend />
        {result.perModelCosts.map((c, i) => (
          <Bar key={c.modelName} dataKey={c.modelName} stackId="a" fill={COLORS[i % COLORS.length]} />
        ))}
        <Bar dataKey="_baseline" name="기준 비용" fill="#94a3b8" />
      </BarChart>
    </ResponsiveContainer>
  )
}
