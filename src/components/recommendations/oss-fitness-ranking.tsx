import { Badge } from '@/components/ui/badge'
import type { IRankedModel } from '@/lib/types/preset'

interface OssFitnessRankingProps {
  readonly rankedModels: readonly IRankedModel[]
}

function formatParams(model: IRankedModel): string {
  const infra = model.infra
  if (!infra?.parameterSize) return ''
  if (infra.architecture === 'moe' && infra.activeParameters) {
    return `${infra.parameterSize}B (A${infra.activeParameters}B)`
  }
  return `${infra.parameterSize}B`
}

function formatContext(contextWindow: number): string {
  if (contextWindow >= 1_000_000) return `${Math.round(contextWindow / 1_000_000)}M`
  return `${Math.round(contextWindow / 1_000)}K`
}

export function OssFitnessRanking({ rankedModels }: OssFitnessRankingProps) {
  const maxScore = rankedModels.length > 0 ? rankedModels[0].score : 100

  return (
    <ul role="list" className="space-y-3">
      {rankedModels.map((model, index) => {
        const widthPercent = maxScore > 0 ? (model.score / maxScore) * 100 : 0
        const infra = model.infra

        return (
          <li key={model.slug} role="listitem" className="space-y-1">
            <div className="flex items-center gap-3">
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
                    className="h-5 rounded bg-emerald-500/80 transition-all"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-semibold">{model.score}</span>
              </div>
            </div>
            {infra && (
              <div className="ml-8 flex flex-wrap items-center gap-1.5">
                {formatParams(model) && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {formatParams(model)}
                  </Badge>
                )}
                {infra.architecture && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                    {infra.architecture}
                  </Badge>
                )}
                {infra.contextWindow && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    ctx {formatContext(infra.contextWindow)}
                  </Badge>
                )}
                {infra.minGpu && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {infra.minGpu}
                  </Badge>
                )}
                {infra.vramInt4 != null && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    VRAM(Q4) {infra.vramInt4}GB
                  </Badge>
                )}
                {infra.estimatedTps != null && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    ~{infra.estimatedTps} tok/s
                  </Badge>
                )}
                {infra.license && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {infra.license}
                  </Badge>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
