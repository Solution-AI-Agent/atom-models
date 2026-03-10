'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { FilterPanel } from '@/components/explore/filter-panel'
import { ViewToggle, type ViewMode } from '@/components/explore/view-toggle'
import { ModelTable } from '@/components/explore/model-table'
import { ModelCardGrid } from '@/components/explore/model-card-grid'
import { SearchInput } from '@/components/shared/search-input'
import { Pagination } from '@/components/shared/pagination'
import { useRouter } from 'next/navigation'
import type { IModel } from '@/lib/types/model'

interface ExploreClientProps {
  readonly models: readonly IModel[]
  readonly total: number
  readonly page: number
  readonly limit: number
}

function ExploreContent({ models, total, page, limit }: ExploreClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') as ViewMode) || 'table'
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || ''
  const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc'

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.push(`/explore?${params.toString()}`)
  }

  const handleSearch = (value: string) => {
    updateParams({
      search: value || null,
      page: null,
    })
  }

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) })
  }

  const handleSort = (field: string) => {
    if (sort === field) {
      updateParams({ order: order === 'asc' ? 'desc' : 'asc' })
    } else {
      updateParams({ sort: field, order: 'desc' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel />

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="모델명, 제공사 검색..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {total}개 모델
          </span>
          <ViewToggle />
        </div>
      </div>

      {view === 'table' ? (
        <ModelTable models={models} sort={sort} order={order} onSort={handleSort} />
      ) : (
        <ModelCardGrid models={models} />
      )}

      <Pagination
        page={page}
        total={total}
        limit={limit}
        onChange={handlePageChange}
      />
    </div>
  )
}

export function ExploreClient(props: ExploreClientProps) {
  return (
    <Suspense>
      <ExploreContent {...props} />
    </Suspense>
  )
}
