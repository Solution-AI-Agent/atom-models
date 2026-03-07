'use client'

import Link from 'next/link'
import { TableRow, TableCell } from '@/components/ui/table'
import { ScoreBadge } from '@/components/shared/score-badge'
import { NewBadge } from '@/components/shared/new-badge'
import { ModelTypeBadge } from '@/components/shared/model-type-badge'
import { PriceDisplay } from '@/components/shared/price-display'
import { useCompare } from '@/contexts/compare-context'
import { formatContextWindow } from '@/lib/utils/format'
import type { IModel } from '@/lib/types/model'

interface ModelTableRowProps {
  readonly model: IModel
}

export function ModelTableRow({ model }: ModelTableRowProps) {
  const { isComparing, addModel, removeModel } = useCompare()
  const comparing = isComparing(model.slug)

  const handleCompareToggle = () => {
    if (comparing) {
      removeModel(model.slug)
    } else {
      addModel(model.slug)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <input
          type="checkbox"
          checked={comparing}
          onChange={handleCompareToggle}
          aria-label={`${model.name} 비교`}
          className="h-4 w-4 rounded border-gray-300"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Link
            href={`/explore/${model.slug}`}
            className="font-medium hover:underline"
          >
            {model.name}
          </Link>
          {model.isRecentlyReleased && <NewBadge />}
        </div>
      </TableCell>
      <TableCell>{model.provider}</TableCell>
      <TableCell>
        <ModelTypeBadge type={model.type} />
      </TableCell>
      <TableCell>
        <PriceDisplay input={model.pricing.input} output={model.pricing.output} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <ScoreBadge label="품질" value={model.scores.quality} />
          <ScoreBadge label="속도" value={model.scores.speed} />
        </div>
      </TableCell>
      <TableCell>{formatContextWindow(model.contextWindow)}</TableCell>
    </TableRow>
  )
}
