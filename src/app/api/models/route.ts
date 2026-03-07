import { NextRequest, NextResponse } from 'next/server'
import { getModels } from '@/lib/services/model.service'
import type { IModelListQuery } from '@/lib/types/model'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const query: IModelListQuery = {
      type: searchParams.get('type') as IModelListQuery['type'] || undefined,
      provider: searchParams.get('provider') || undefined,
      tier: searchParams.get('tier') || undefined,
      minPrice: searchParams.has('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.has('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') as IModelListQuery['order'] || undefined,
      page: searchParams.has('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
    }

    const result = await getModels(query)

    return NextResponse.json({
      success: true,
      data: result.models,
      meta: { total: result.total, page: result.page, limit: result.limit },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch models' },
      { status: 500 },
    )
  }
}
