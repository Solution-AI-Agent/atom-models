import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NewBadge } from '@/components/shared/new-badge'
import { ScoreBadge } from '@/components/shared/score-badge'
import { ModelTypeBadge } from '@/components/shared/model-type-badge'
import { formatDate, formatPrice } from '@/lib/utils/format'
import type { IModel } from '@/lib/types/model'

interface NewModelsSectionProps {
  readonly models: readonly IModel[]
}

export function NewModelsSection({ models }: NewModelsSectionProps) {
  if (models.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">최근 등록 모델</h2>
        <NewBadge />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <Link key={model.slug} href={`/explore/${model.slug}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{model.name}</span>
                  <ModelTypeBadge type={model.type} />
                </CardTitle>
                <p className="text-sm text-muted-foreground">{model.providerId}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {model.benchmarks.mmlu != null && <ScoreBadge label="MMLU" value={model.benchmarks.mmlu} />}
                  {model.benchmarks.gpqa != null && <ScoreBadge label="GPQA" value={model.benchmarks.gpqa} />}
                  {model.benchmarks.swe_bench != null && <ScoreBadge label="SWE-bench" value={model.benchmarks.swe_bench} />}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Out: {formatPrice(model.pricing.outputPer1m ?? 0)}/1M</span>
                  <span>{formatDate(model.releaseDate)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
