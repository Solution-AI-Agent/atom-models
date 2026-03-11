import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge } from '@/components/shared/score-badge'
import { ModelTypeBadge } from '@/components/shared/model-type-badge'
import { formatPrice } from '@/lib/utils/format'
import type { IModel } from '@/lib/types/model'

interface SimilarModelsProps {
  readonly models: readonly IModel[]
}

export function SimilarModels({ models }: SimilarModelsProps) {
  if (models.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">유사 모델</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {models.map((model) => (
          <Link key={model.slug} href={`/explore/${model.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{model.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{model.providerId}</span>
                  <ModelTypeBadge type={model.type} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-2">
                  {model.benchmarks.mmlu != null && <ScoreBadge label="MMLU" value={model.benchmarks.mmlu} />}
                  {model.benchmarks.gpqa != null && <ScoreBadge label="GPQA" value={model.benchmarks.gpqa} />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Out: {formatPrice(model.pricing.outputPer1m ?? 0)}/1M
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
