export const dynamic = 'force-dynamic'

import { getModels } from '@/lib/services/model.service'
import { ExploreClient } from '@/components/explore/explore-client'
import type { IModelListQuery, ModelType } from '@/lib/types/model'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '모델 탐색 - Atom Models',
  description: 'LLM 모델을 필터링, 정렬, 검색하여 최적의 모델을 찾아보세요.',
}

interface ExplorePageProps {
  readonly searchParams: Promise<Record<string, string | undefined>>
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams

  const query: IModelListQuery = {
    type: params.type as ModelType | undefined,
    provider: params.provider,
    tier: params.tier,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    search: params.search,
    sort: params.sort || 'name',
    order: (params.order as 'asc' | 'desc') || 'asc',
    page: params.page ? Number(params.page) : 1,
    limit: 50,
  }

  const result = await getModels(query)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">모델 탐색</h1>
        <p className="text-muted-foreground">
          LLM 모델을 필터링하고 비교할 모델을 선택하세요
        </p>
      </div>
      <ExploreClient
        models={result.models}
        total={result.total}
        page={result.page}
        limit={result.limit}
      />
    </div>
  )
}
