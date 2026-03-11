export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getPresetsByCategory } from '@/lib/services/preset.service'
import { getRankedModelsForPreset } from '@/lib/services/recommendation.service'
import { PresetCard } from '@/components/recommendations/preset-card'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IBvaPresetDocument } from '@/lib/db/models/bva-preset'

interface PageProps {
  params: Promise<{ categorySlug: string }>
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { categorySlug } = await params
  const presets = await getPresetsByCategory(categorySlug)

  if (presets.length === 0) {
    notFound()
  }

  const categoryName = presets[0].category

  const presetsWithRankedModels = await Promise.all(
    presets.map(async (preset) => {
      const rankedModels = await getRankedModelsForPreset(preset as unknown as IBvaPresetDocument)
      return {
        preset: {
          _id: String(preset._id),
          category: preset.category,
          categorySlug: preset.categorySlug,
          taskType: preset.taskType,
          taskTypeSlug: preset.taskTypeSlug,
          weights: preset.weights,
          recommendations: preset.recommendations,
          description: preset.description,
          keyFactors: preset.keyFactors,
        },
        rankedModels,
      }
    }),
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/recommendations">
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            산업별 추천
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{categoryName}</h1>
        <p className="mt-1 text-muted-foreground">
          {categoryName} 분야의 업무 유형별 최적 모델을 확인하세요.
        </p>
      </div>

      <div className="space-y-6">
        {presetsWithRankedModels.map(({ preset, rankedModels }) => (
          <PresetCard
            key={preset.taskTypeSlug}
            preset={preset}
            rankedModels={rankedModels}
          />
        ))}
      </div>
    </div>
  )
}
