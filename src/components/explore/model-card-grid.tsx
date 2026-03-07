import { ModelCard } from '@/components/explore/model-card'
import { MODEL_TIERS } from '@/lib/constants/tiers'
import type { IModel, ModelTier } from '@/lib/types/model'

interface ModelCardGridProps {
  readonly models: readonly IModel[]
}

function groupByTier(models: readonly IModel[]): Record<string, readonly IModel[]> {
  const groups: Record<string, IModel[]> = {}
  for (const model of models) {
    const tier = model.tier
    if (!groups[tier]) {
      groups[tier] = []
    }
    groups[tier].push(model)
  }
  return groups
}

const tierOrder: readonly ModelTier[] = ['flagship', 'mid', 'small', 'mini', 'micro']

export function ModelCardGrid({ models }: ModelCardGridProps) {
  const grouped = groupByTier(models)

  return (
    <div className="flex flex-col gap-8">
      {tierOrder.map((tier) => {
        const tierModels = grouped[tier]
        if (!tierModels || tierModels.length === 0) return null

        const tierInfo = MODEL_TIERS[tier]

        return (
          <section key={tier}>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold">{tierInfo.label}</h3>
              <span className="text-sm text-muted-foreground">
                {tierInfo.paramRange} · {tierModels.length}개
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tierModels.map((model) => (
                <ModelCard key={model.slug} model={model} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
