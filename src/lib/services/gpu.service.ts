import { getConnection } from '@/lib/db/connection'
import { GpuReferenceModel } from '@/lib/db/models/gpu-reference'
import { ModelModel } from '@/lib/db/models/model'
import { serialize } from '@/lib/utils/serialize'
import type { ICompatibleModel, QuantizationLevel } from '@/lib/types/gpu'

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

export async function getGpuBySlug(slug: string) {
  await getConnection()

  const gpu = await GpuReferenceModel.findOne({ slug }).lean()
  if (!gpu) return null

  return serialize(gpu)
}

async function getRefGpuTflopsMap(): Promise<ReadonlyMap<string, number>> {
  const gpus = await GpuReferenceModel.find({}).lean()
  const map = new Map<string, number>()
  for (const gpu of gpus) {
    map.set(gpu.name, gpu.fp16Tflops)
  }
  return map
}

function extractGpuName(minGpu: string): string {
  // minGpu format examples: "NVIDIA RTX 4090", "NVIDIA A100 80GB SXM"
  return minGpu.trim()
}

function computeQuantizations(
  vramFp16: number,
  vramInt8: number,
  vramInt4: number,
  gpuVram: number,
): readonly { readonly level: QuantizationLevel; readonly vramRequired: number; readonly fits: boolean }[] {
  return [
    { level: 'fp16' as const, vramRequired: vramFp16, fits: vramFp16 <= gpuVram },
    { level: 'int8' as const, vramRequired: vramInt8, fits: vramInt8 <= gpuVram },
    { level: 'int4' as const, vramRequired: vramInt4, fits: vramInt4 <= gpuVram },
  ]
}

function determineBestQuantization(
  allQuantizations: readonly { readonly level: QuantizationLevel; readonly vramRequired: number; readonly fits: boolean }[],
): { readonly level: QuantizationLevel; readonly vramRequired: number } | null {
  // fp16 > int8 > int4 (highest precision first)
  for (const q of allQuantizations) {
    if (q.fits) {
      return { level: q.level, vramRequired: q.vramRequired }
    }
  }
  return null
}

export async function getCompatibleModels(
  gpuVram: number,
  gpuFp16Tflops: number,
): Promise<readonly ICompatibleModel[]> {
  await getConnection()

  const [ossModels, refTflopsMap] = await Promise.all([
    ModelModel.find({
      type: 'open-source',
      infrastructure: { $ne: null },
    }).lean(),
    getRefGpuTflopsMap(),
  ])

  const compatible: ICompatibleModel[] = []

  for (const model of ossModels) {
    const infra = model.infrastructure
    if (!infra) continue

    const allQuantizations = computeQuantizations(
      infra.vramFp16,
      infra.vramInt8,
      infra.vramInt4,
      gpuVram,
    )

    const best = determineBestQuantization(allQuantizations)
    if (!best) continue

    // TPS scaling based on GPU performance ratio
    const refGpuName = extractGpuName(infra.minGpu)
    const refTflops = refTflopsMap.get(refGpuName)
    const estimatedTps = refTflops
      ? Math.round(infra.estimatedTps * (gpuFp16Tflops / refTflops) * 10) / 10
      : infra.estimatedTps

    compatible.push({
      name: model.name,
      slug: model.slug,
      provider: model.provider,
      parameterSize: model.parameterSize ?? null,
      architecture: model.architecture,
      bestQuantization: best.level,
      vramRequired: best.vramRequired,
      estimatedTps,
      allQuantizations,
    })
  }

  // Sort by estimatedTps descending
  const sorted = [...compatible].sort((a, b) => b.estimatedTps - a.estimatedTps)
  return serialize(sorted)
}
