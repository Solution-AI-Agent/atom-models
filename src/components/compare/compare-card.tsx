import { Button } from '@/components/ui/button'
import { ModelTypeBadge } from '@/components/shared/model-type-badge'
import { X } from 'lucide-react'
import type { IModel } from '@/lib/types/model'

interface CompareCardProps {
  readonly model: IModel
  readonly onRemove: (slug: string) => void
}

export function CompareCard({ model, onRemove }: CompareCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{model.name}</h3>
          <span className="text-sm text-muted-foreground">{model.provider}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onRemove(model.slug)}
          aria-label={`${model.name} 제거`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ModelTypeBadge type={model.type} />
    </div>
  )
}
