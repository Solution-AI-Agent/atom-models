import { NextRequest, NextResponse } from 'next/server'
import { getPresetsByCategory } from '@/lib/services/preset.service'
import { getRankedModelsForPreset } from '@/lib/services/recommendation.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categorySlug: string }> },
) {
  try {
    const { categorySlug } = await params
    const presets = await getPresetsByCategory(categorySlug)

    if (presets.length === 0) {
      return NextResponse.json(
        { success: false, error: '해당 카테고리를 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    const presetsWithRanking = await Promise.all(
      presets.map(async (preset) => ({
        ...preset,
        rankedModels: await getRankedModelsForPreset(preset as any),
      })),
    )

    return NextResponse.json({
      success: true,
      data: {
        category: presets[0].category,
        categorySlug,
        presets: presetsWithRanking,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category presets' },
      { status: 500 },
    )
  }
}
