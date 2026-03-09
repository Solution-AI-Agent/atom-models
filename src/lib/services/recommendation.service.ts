import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import { calculateFitnessScore, calculateFitnessBreakdown } from '@/lib/utils/score'
import type { IIndustryPresetDocument } from '@/lib/db/models/industry-preset'
import type { IRankedModel, IRankedModelInfra } from '@/lib/types/preset'

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

export async function getRankedModelsForPreset(
  preset: IIndustryPresetDocument,
  limitPerType = 5,
): Promise<IRankedModel[]> {
  await getConnection()
  const models = await ModelModel.find().lean()

  const ranked = models.map((model) => {
    const koreanScore = model.languageScores instanceof Map
      ? (model.languageScores.get('ko') || 0)
      : ((model.languageScores as any)?.ko || 0)

    const score = calculateFitnessScore(
      model.scores,
      model.pricing,
      koreanScore,
      preset.weights,
    )

    const breakdown = calculateFitnessBreakdown(
      model.scores,
      model.pricing,
      koreanScore,
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
