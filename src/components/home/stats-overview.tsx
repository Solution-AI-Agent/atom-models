import { Card, CardContent } from '@/components/ui/card'
import { DatabaseIcon, LayersIcon } from 'lucide-react'

interface StatsOverviewProps {
  readonly modelCount: number
  readonly presetCount: number
}

const stats = (modelCount: number, presetCount: number) => [
  { label: '등록 모델', value: modelCount, icon: DatabaseIcon },
  { label: '산업 프리셋', value: presetCount, icon: LayersIcon },
]

export function StatsOverview({ modelCount, presetCount }: StatsOverviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats(modelCount, presetCount).map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-muted p-2.5">
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
