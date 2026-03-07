import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge } from '@/components/shared/score-badge'
import type { IModelScores } from '@/lib/types/model'

interface ScoreOverviewProps {
  readonly scores: IModelScores
}

const SCORE_LABELS: Record<keyof IModelScores, string> = {
  quality: '품질',
  speed: '속도',
  reasoning: '추론',
  coding: '코딩',
  multimodal: '멀티모달',
}

export function ScoreOverview({ scores }: ScoreOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>평가 점수</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(scores) as [keyof IModelScores, number][]).map(
            ([key, value]) => (
              <ScoreBadge key={key} label={SCORE_LABELS[key]} value={value} />
            ),
          )}
        </div>
      </CardContent>
    </Card>
  )
}
