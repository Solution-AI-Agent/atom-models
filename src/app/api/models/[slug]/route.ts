import { NextRequest, NextResponse } from 'next/server'
import { getModelBySlug, getSimilarModels } from '@/lib/services/model.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const model = await getModelBySlug(slug)

    if (!model) {
      return NextResponse.json(
        { success: false, error: '모델을 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    const similarModels = await getSimilarModels(slug)

    return NextResponse.json({
      success: true,
      data: { ...model, similarModels },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch model' },
      { status: 500 },
    )
  }
}
