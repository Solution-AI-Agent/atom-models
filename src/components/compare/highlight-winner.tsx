import { cn } from '@/lib/utils'

interface HighlightWinnerProps {
  readonly values: readonly number[]
  readonly index: number
  readonly mode?: 'highest' | 'lowest'
  readonly children: React.ReactNode
}

export function HighlightWinner({ values, index, mode = 'highest', children }: HighlightWinnerProps) {
  if (values.length < 2) {
    return <>{children}</>
  }

  const target = mode === 'highest' ? Math.max(...values) : Math.min(...values)
  const isWinner = values[index] === target && values.filter((v) => v === target).length === 1

  return (
    <div className={cn(isWinner && 'rounded-md bg-green-50 px-2 py-1 font-semibold text-green-700')}>
      {children}
    </div>
  )
}
