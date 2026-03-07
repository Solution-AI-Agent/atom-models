'use client'

import { Button } from '@/components/ui/button'
import { NewBadge } from '@/components/shared/new-badge'
import { ModelTypeBadge } from '@/components/shared/model-type-badge'
import { useCompare } from '@/contexts/compare-context'
import { formatDate } from '@/lib/utils/format'
import { GitCompareArrowsIcon, CheckIcon } from 'lucide-react'
import type { IModel } from '@/lib/types/model'

interface ModelHeaderProps {
  readonly model: IModel
}

export function ModelHeader({ model }: ModelHeaderProps) {
  const { isComparing, addModel, removeModel } = useCompare()
  const comparing = isComparing(model.slug)

  const handleCompare = () => {
    if (comparing) {
      removeModel(model.slug)
    } else {
      addModel(model.slug)
    }
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">{model.name}</h1>
          {model.isRecentlyReleased && <NewBadge />}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{model.provider}</span>
          <span>·</span>
          <ModelTypeBadge type={model.type} />
          <span>·</span>
          <span>{formatDate(model.releaseDate)}</span>
        </div>
      </div>
      <Button
        variant={comparing ? 'secondary' : 'outline'}
        onClick={handleCompare}
      >
        {comparing ? (
          <CheckIcon className="mr-2 h-4 w-4" />
        ) : (
          <GitCompareArrowsIcon className="mr-2 h-4 w-4" />
        )}
        {comparing ? '비교 중' : '비교 추가'}
      </Button>
    </div>
  )
}
