import { Badge } from '@/components/ui/badge'
import type { IPresetRecommendation } from '@/lib/types/preset'

interface RecommendationListProps {
  readonly title: string
  readonly variant: 'commercial' | 'costEffective' | 'openSource'
  readonly recommendations: readonly IPresetRecommendation[]
}

const variantConfig = {
  commercial: { label: '상용 추천', badgeVariant: 'default' as const },
  costEffective: { label: '가성비 추천', badgeVariant: 'secondary' as const },
  openSource: { label: '오픈소스 추천', badgeVariant: 'outline' as const },
} as const

export function RecommendationList({ title, variant, recommendations }: RecommendationListProps) {
  const config = variantConfig[variant]

  if (recommendations.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
      </h4>
      <ul className="space-y-1.5">
        {recommendations.map((rec) => (
          <li key={rec.modelSlug} className="flex items-start gap-2 text-sm">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
            <div>
              <span className="font-medium">{rec.modelSlug}</span>
              <span className="ml-1 text-muted-foreground">- {rec.reason}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
