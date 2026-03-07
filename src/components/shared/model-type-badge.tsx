import { Badge } from '@/components/ui/badge'

interface ModelTypeBadgeProps {
  readonly type: 'commercial' | 'open-source'
}

export function ModelTypeBadge({ type }: ModelTypeBadgeProps) {
  return (
    <Badge variant={type === 'commercial' ? 'default' : 'secondary'}>
      {type === 'commercial' ? 'Commercial' : 'Open Source'}
    </Badge>
  )
}
