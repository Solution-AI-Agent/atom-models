import { getConnection } from '@/lib/db/connection'
import { GpuReferenceModel } from '@/lib/db/models/gpu-reference'
import { serialize } from '@/lib/utils/serialize'

interface GpuQuery {
  readonly category?: string
  readonly minVram?: number
}

export async function getGpuList(query: GpuQuery) {
  await getConnection()

  const filter: Record<string, any> = {}
  if (query.category) filter.category = query.category
  if (query.minVram) filter.vram = { $gte: query.minVram }

  const gpus = await GpuReferenceModel.find(filter).sort({ vram: -1 }).lean()
  return serialize(gpus)
}
