import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  readonly label: string
  readonly value: number
}

function getScoreColor(value: number): string {
  if (value >= 80) return 'text-green-700 bg-green-50'
  if (value >= 60) return 'text-yellow-700 bg-yellow-50'
  return 'text-red-700 bg-red-50'
}

export function ScoreBadge({ label, value }: ScoreBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', getScoreColor(value))}>
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}
