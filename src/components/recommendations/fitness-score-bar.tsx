import type { IRankedModel } from '@/lib/types/preset'

interface FitnessScoreBarProps {
  readonly rankedModels: readonly IRankedModel[]
  readonly barColorClass?: string
}

export function FitnessScoreBar({ rankedModels, barColorClass = 'bg-primary/80' }: FitnessScoreBarProps) {
  const maxScore = rankedModels.length > 0 ? rankedModels[0].score : 100

  return (
    <ul role="list" className="space-y-2">
      {rankedModels.map((model, index) => {
        const widthPercent = maxScore > 0 ? (model.score / maxScore) * 100 : 0

        return (
          <li key={model.slug} role="listitem" className="flex items-center gap-3">
            <span className="w-5 text-right text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-[100px] truncate text-sm">
                <span className="font-medium">{model.name}</span>
                <span className="ml-1 text-xs text-muted-foreground">{model.provider}</span>
              </div>
              <div className="flex-1">
                <div
                  className={`h-5 rounded transition-all ${barColorClass}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm font-semibold">{model.score}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
