import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import { calculateFitnessScore, calculateFitnessBreakdown } from '@/lib/utils/score'
import type { IIndustryPresetDocument } from '@/lib/db/models/industry-preset'
import type { IRankedModel } from '@/lib/types/preset'

export async function getRankedModelsForPreset(
  preset: IIndustryPresetDocument,
  limitCount = 10,
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

    return {
      slug: model.slug,
      name: model.name,
      provider: model.provider,
      score: Math.round(score * 100) / 100,
      breakdown,
    }
  })

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, limitCount)
}
