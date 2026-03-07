interface PriceDisplayProps {
  readonly input: number
  readonly output: number
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return `$${price.toFixed(2)}`
}

export function PriceDisplay({ input, output }: PriceDisplayProps) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">In:</span>
        <span className="font-medium">{formatPrice(input)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Out:</span>
        <span className="font-medium">{formatPrice(output)}</span>
      </div>
    </div>
  )
}
