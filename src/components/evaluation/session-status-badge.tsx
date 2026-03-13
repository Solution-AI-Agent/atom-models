import { Badge } from '@/components/ui/badge'
import type { EvaluationStatus } from '@/lib/types/evaluation'

const STATUS_CONFIG: Record<EvaluationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  running: { label: 'Running', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function SessionStatusBadge({ status }: { readonly status: EvaluationStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
