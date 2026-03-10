import { getConnection } from '@/lib/db/connection'
import { GpuReferenceModel } from '@/lib/db/models/gpu-reference'
import { ModelModel } from '@/lib/db/models/model'
import { serialize } from '@/lib/utils/serialize'
import { QUANTIZATION_LEVELS } from '@/lib/constants/quantizations'
import type { ICompatibleModel, ITpsFormula, QuantizationLevel } from '@/lib/types/gpu'

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

interface QuantizationEntry {
  readonly level: QuantizationLevel
  readonly vramRequired: number
  readonly fits: boolean
}

/** Maps QuantizationLevel key to the corresponding infrastructure VRAM field name */
const QUANT_VRAM_FIELD_MAP: Readonly<Record<QuantizationLevel, string>> = {
  fp16: 'vramFp16',
  fp8: 'vramFp8',
  int8: 'vramInt8',
  int4: 'vramInt4',
  q6_k: 'vramQ6k',
  q5_k: 'vramQ5k',
  q4_k_m: 'vramQ4kM',
  q3_k: 'vramQ3k',
  q2_k: 'vramQ2k',
}

function computeQuantizations(
  infra: Record<string, any>,
  gpuVram: number,
): readonly QuantizationEntry[] {
  const result: QuantizationEntry[] = []

  for (const meta of QUANTIZATION_LEVELS) {
    const fieldName = QUANT_VRAM_FIELD_MAP[meta.key]
    const vramValue = infra[fieldName]
    if (vramValue == null) continue

    result.push({
      level: meta.key,
      vramRequired: vramValue,
      fits: vramValue <= gpuVram,
    })
  }

  return result
}

function determineBestQuantization(
  allQuantizations: readonly QuantizationEntry[],
): { readonly level: QuantizationLevel; readonly vramRequired: number } | null {
  // Ordered by precision (highest first, driven by QUANTIZATION_LEVELS)
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

    const allQuantizations = computeQuantizations(infra, gpuVram)

    const best = determineBestQuantization(allQuantizations)
    if (!best) continue

    // TPS scaling based on GPU performance ratio
    const refGpuName = extractGpuName(infra.minGpu)
    const refTflops = refTflopsMap.get(refGpuName)

    const tpsFormula: ITpsFormula | null = refTflops
      ? {
          baseTps: infra.estimatedTps,
          refGpuName,
          refTflops,
          targetTflops: gpuFp16Tflops,
          ratio: Math.round((gpuFp16Tflops / refTflops) * 1000) / 1000,
        }
      : null

    const estimatedTps = tpsFormula
      ? Math.round(infra.estimatedTps * tpsFormula.ratio * 10) / 10
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
      tpsFormula,
    })
  }

  // Sort by estimatedTps descending
  const sorted = [...compatible].sort((a, b) => b.estimatedTps - a.estimatedTps)
  return serialize(sorted)
}
