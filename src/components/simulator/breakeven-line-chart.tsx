'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts'
import type { IBreakevenChartPoint } from '@/lib/types/simulator'

interface BreakevenLineChartProps {
  readonly chartData: readonly IBreakevenChartPoint[]
  readonly breakevenPoint: number | null
}

export function BreakevenLineChart({ chartData, breakevenPoint }: BreakevenLineChartProps) {
  const tickFormatter = (value: number) => `$${value.toLocaleString()}`
  const xFormatter = (value: number) => value.toLocaleString()

  const breakevenData = breakevenPoint !== null
    ? chartData.find((p) => p.dailyRequests >= breakevenPoint)
    : null

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData as IBreakevenChartPoint[]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="dailyRequests"
          tickFormatter={xFormatter}
          className="text-xs"
          label={{ value: '일 요청 수', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tickFormatter={tickFormatter}
          className="text-xs"
          label={{ value: '월 비용 ($)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: unknown) => `$${Number(value).toLocaleString()}`}
          labelFormatter={(v) => `일 ${Number(v).toLocaleString()}건`}
        />
        <Legend />
        <Line type="monotone" dataKey="apiCost" name="API 비용" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="selfHostedCost" name="셀프호스팅 비용" stroke="#ea580c" strokeWidth={2} dot={false} strokeDasharray="8 4" />
        {breakevenData && (
          <ReferenceDot
            x={breakevenData.dailyRequests}
            y={breakevenData.apiCost}
            r={6}
            fill="#16a34a"
            stroke="#fff"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
