export function parseModelData(raw: Record<string, unknown>): Record<string, unknown> & { releaseDate: Date; lastVerifiedAt: Date } {
  return {
    ...raw,
    openRouterModelId: raw.openRouterModelId || null,
    releaseDate: new Date(raw.releaseDate as string),
    lastVerifiedAt: raw.lastVerifiedAt
      ? new Date(raw.lastVerifiedAt as string)
      : new Date(),
  }
}

export function parsePresetData(raw: Record<string, unknown>) {
  return { ...raw }
}

export function parseGpuData(raw: Record<string, unknown>) {
  return { ...raw }
}
