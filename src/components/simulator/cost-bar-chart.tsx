'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { IModelCostBreakdown } from '@/lib/types/simulator'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea']

interface CostBarChartProps {
  readonly breakdowns: readonly IModelCostBreakdown[]
  readonly mode: 'monthly' | 'annual'
}

export function CostBarChart({ breakdowns, mode }: CostBarChartProps) {
  const data = breakdowns.map((b) => ({
    name: b.model.name,
    cost: mode === 'monthly' ? b.totalMonthlyCost : b.totalAnnualCost,
  }))

  const tickFormatter = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis tickFormatter={tickFormatter} className="text-xs" />
        <Tooltip formatter={(value: unknown) => `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Bar dataKey="cost" name={mode === 'monthly' ? '월간 비용' : '연간 비용'}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
