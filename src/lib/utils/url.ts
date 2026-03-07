export function encodeCompareParams(slugs: readonly string[]): string {
  return slugs.join(',')
}

export function decodeCompareParams(param: string): string[] {
  if (!param) return []
  return param.split(',').filter(Boolean)
}

export function encodeFilterParams(filters: Record<string, string | number | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  return params
}
