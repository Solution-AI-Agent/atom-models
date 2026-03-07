interface PriceDiffProps {
  readonly prices: readonly number[]
}

export function PriceDiff({ prices }: PriceDiffProps) {
  if (prices.length < 2) {
    return <span className="text-sm text-muted-foreground">-</span>
  }

  const max = Math.max(...prices)
  const min = Math.min(...prices)
  const diff = max - min
  const multiplier = min > 0 ? max / min : 1

  return (
    <div className="flex flex-col items-center gap-0.5 text-xs">
      <span className="font-medium text-orange-600">${diff.toFixed(2)}</span>
      <span className="text-muted-foreground">{multiplier.toFixed(1)}x</span>
    </div>
  )
}
