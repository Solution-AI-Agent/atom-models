import { InboxIcon } from 'lucide-react'

interface EmptyStateProps {
  readonly message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <InboxIcon className="h-12 w-12 mb-4" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
