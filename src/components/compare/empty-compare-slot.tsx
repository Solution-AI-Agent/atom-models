import { Plus } from 'lucide-react'

interface EmptyCompareSlotProps {
  readonly onSelect?: () => void
}

export function EmptyCompareSlot({ onSelect }: EmptyCompareSlotProps) {
  return (
    <button
      onClick={onSelect}
      className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
    >
      <Plus className="h-8 w-8" />
      <span className="text-sm">모델 추가</span>
    </button>
  )
}
