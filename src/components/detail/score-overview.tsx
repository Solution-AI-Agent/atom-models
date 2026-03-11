import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge } from '@/components/shared/score-badge'
import { BENCHMARKS } from '@/lib/constants/benchmarks'
import type { BenchmarkKey } from '@/lib/types/model'

interface ScoreOverviewProps {
  readonly benchmarks: Partial<Record<BenchmarkKey, number | null>>
}

export function ScoreOverview({ benchmarks }: ScoreOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>벤치마크 점수</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(BENCHMARKS) as [BenchmarkKey, { label: string }][]).map(
            ([key, meta]) => {
              const value = benchmarks[key]
              if (value == null) return null
              return (
                <ScoreBadge key={key} label={meta.label} value={value} />
              )
            },
          )}
        </div>
      </CardContent>
    </Card>
  )
}
