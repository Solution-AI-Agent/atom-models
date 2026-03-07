import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RecommendationList } from './recommendation-list'
import { FitnessScoreBar } from './fitness-score-bar'
import type { IIndustryPreset, IRankedModel } from '@/lib/types/preset'

interface PresetCardProps {
  readonly preset: IIndustryPreset
  readonly rankedModels: readonly IRankedModel[]
}

export function PresetCard({ preset, rankedModels }: PresetCardProps) {
  const topModels = rankedModels.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{preset.taskType}</CardTitle>
        <p className="text-sm text-muted-foreground">{preset.description}</p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {preset.keyFactors.map((factor) => (
            <Badge key={factor} variant="outline" className="text-xs">
              {factor}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {topModels.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">적합도 순위 (상위 5)</h4>
            <FitnessScoreBar rankedModels={topModels} />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <RecommendationList
            title="상용"
            variant="commercial"
            recommendations={preset.recommendations.commercial}
          />
          <RecommendationList
            title="가성비"
            variant="costEffective"
            recommendations={preset.recommendations.costEffective}
          />
          <RecommendationList
            title="오픈소스"
            variant="openSource"
            recommendations={preset.recommendations.openSource}
          />
        </div>
      </CardContent>
    </Card>
  )
}
