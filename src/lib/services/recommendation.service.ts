import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import {
  calculateDimensionScore,
  calculateCostScore,
  calculateFitnessScore,
  calculateFitnessBreakdown,
} from '@/lib/utils/score'
import { BVA_DIMENSIONS } from '@/lib/constants/bva-dimensions'
import type { IIndustryPresetDocument } from '@/lib/db/models/industry-preset'
import type { IRankedModel, IRankedModelInfra } from '@/lib/types/preset'
import type { BvaDimensionKey } from '@/lib/types/bva'

const MAX_PER_PROVIDER = 2

function diversify(
  models: readonly IRankedModel[],
  limit: number,
): IRankedModel[] {
  const result: IRankedModel[] = []
  const providerCount: Record<string, number> = {}

  for (const model of models) {
    const count = providerCount[model.provider] ?? 0
    if (count < MAX_PER_PROVIDER) {
      result.push(model)
      providerCount[model.provider] = count + 1
    }
    if (result.length >= limit) break
  }

  return result
}

function extractBenchmarks(
  benchmarksField: unknown,
): Partial<Record<string, number | null>> {
  if (benchmarksField instanceof Map) {
    const result: Record<string, number | null> = {}
    benchmarksField.forEach((value: number | null, key: string) => {
      result[key] = value
    })
    return result
  }
  return (benchmarksField as Record<string, number | null>) ?? {}
}

export async function getRankedModelsForPreset(
  preset: IIndustryPresetDocument,
  limitPerType = 5,
): Promise<IRankedModel[]> {
  await getConnection()
  const models = await ModelModel.find().lean()

  const ranked = models.map((model) => {
    const benchmarks = extractBenchmarks(model.benchmarks)

    const dimensionScores = BVA_DIMENSIONS.reduce(
      (acc, dim) => ({
        ...acc,
        [dim.key]: calculateDimensionScore(benchmarks, dim.formula),
      }),
      {} as Record<BvaDimensionKey, number | null>,
    )

    const costScore = calculateCostScore(
      model.pricing,
      model.type as 'commercial' | 'open-source',
    )

    const score = calculateFitnessScore(
      dimensionScores,
      costScore,
      preset.weights,
    )

    const breakdown = calculateFitnessBreakdown(
      dimensionScores,
      costScore,
      preset.weights,
    )

    const infra: IRankedModelInfra | null = model.type === 'open-source'
      ? {
          parameterSize: model.parameterSize ?? null,
          activeParameters: model.activeParameters ?? null,
          architecture: (model.architecture as 'dense' | 'moe') ?? null,
          contextWindow: model.contextWindow,
          license: model.license,
          minGpu: model.infrastructure?.minGpu ?? null,
          vramInt4: model.infrastructure?.vramInt4 ?? null,
          estimatedTps: model.infrastructure?.estimatedTps ?? null,
        }
      : null

    return {
      slug: model.slug,
      name: model.name,
      provider: model.provider,
      type: model.type as 'commercial' | 'open-source',
      score: Math.round(score * 100) / 100,
      breakdown,
      infra,
    }
  })

  const sorted = ranked.sort((a, b) => b.score - a.score)
  const commercial = diversify(
    sorted.filter((m) => m.type === 'commercial'),
    limitPerType,
  )
  const oss = diversify(
    sorted.filter((m) => m.type === 'open-source'),
    limitPerType,
  )

  return [...commercial, ...oss]
}
