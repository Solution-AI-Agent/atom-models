'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge } from '@/components/shared/score-badge'
import { NewBadge } from '@/components/shared/new-badge'
import { ModelTypeBadge } from '@/components/shared/model-type-badge'
import { useCompare } from '@/contexts/compare-context'
import { formatPrice, formatContextWindow } from '@/lib/utils/format'
import { CpuIcon } from 'lucide-react'
import type { IModel } from '@/lib/types/model'

interface ModelCardProps {
  readonly model: IModel
}

export function ModelCard({ model }: ModelCardProps) {
  const { isComparing, addModel, removeModel } = useCompare()
  const comparing = isComparing(model.slug)

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (comparing) {
      removeModel(model.slug)
    } else {
      addModel(model.slug)
    }
  }

  return (
    <Link href={`/explore/${model.slug}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 overflow-hidden">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="truncate">{model.name}</span>
                {model.isRecentlyReleased && <NewBadge />}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{model.provider}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ModelTypeBadge type={model.type} />
              <button
                onClick={handleCompareToggle}
                className={`h-4 w-4 rounded border ${comparing ? 'border-primary bg-primary' : 'border-gray-300'}`}
                aria-label={`${model.name} 비교`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              <ScoreBadge label="품질" value={model.scores.quality} />
              <ScoreBadge label="속도" value={model.scores.speed} />
              <ScoreBadge label="추론" value={model.scores.reasoning} />
              <ScoreBadge label="코딩" value={model.scores.coding} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">In:</span> {formatPrice(model.pricing.input)}/1M
              </div>
              <div>
                <span className="font-medium">Out:</span> {formatPrice(model.pricing.output)}/1M
              </div>
              {model.parameterSize && (
                <div>
                  <span className="font-medium">파라미터:</span> {model.parameterSize}B
                </div>
              )}
              <div>
                <span className="font-medium">컨텍스트:</span> {formatContextWindow(model.contextWindow)}
              </div>
            </div>

            {model.type === 'open-source' && model.infrastructure && (
              <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-xs">
                <CpuIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{model.infrastructure.minGpu}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
