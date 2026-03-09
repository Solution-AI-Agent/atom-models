import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RecommendationList } from './recommendation-list'
import { FitnessScoreBar } from './fitness-score-bar'
import { OssFitnessRanking } from './oss-fitness-ranking'
import type { IIndustryPreset, IRankedModel } from '@/lib/types/preset'

interface PresetCardProps {
  readonly preset: IIndustryPreset
  readonly rankedModels: readonly IRankedModel[]
}

export function PresetCard({ preset, rankedModels }: PresetCardProps) {
  const commercialModels = rankedModels.filter((m) => m.type === 'commercial').slice(0, 5)
  const ossModels = rankedModels.filter((m) => m.type === 'open-source').slice(0, 5)

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
        {commercialModels.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">상용 모델 적합도 (상위 5)</h4>
            <FitnessScoreBar rankedModels={commercialModels} barColorClass="bg-blue-500/80" />
          </div>
        )}

        {ossModels.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">오픈소스 모델 적합도 (상위 5)</h4>
            <OssFitnessRanking rankedModels={ossModels} />
          </div>
        )}

        {preset.recommendations.costEffective.length > 0 && (
          <RecommendationList
            title="가성비"
            variant="costEffective"
            recommendations={preset.recommendations.costEffective}
          />
        )}
      </CardContent>
    </Card>
  )
}
