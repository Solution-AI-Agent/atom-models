export function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  if (price < 0.01) return `$${price}`
  if (price < 1) return `$${price}`
  return `$${price.toFixed(2)}`
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`
  return `${num}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

export function formatContextWindow(tokens: number): string {
  return formatNumber(tokens)
}
