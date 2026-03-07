'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCompare } from '@/contexts/compare-context'
import { CompareGrid } from '@/components/compare/compare-grid'
import { EmptyCompareSlot } from '@/components/compare/empty-compare-slot'
import { ShareButton } from '@/components/compare/share-button'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { decodeCompareParams, encodeCompareParams } from '@/lib/utils/url'
import { Trash2 } from 'lucide-react'
import type { IModel } from '@/lib/types/model'

export default function ComparePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { models: contextSlugs, addModel, removeModel, clearAll } = useCompare()
  const [modelData, setModelData] = useState<IModel[]>([])
  const [loading, setLoading] = useState(true)

  const urlSlugs = decodeCompareParams(searchParams.get('models') || '')
  const activeSlugs = urlSlugs.length > 0 ? urlSlugs : contextSlugs

  useEffect(() => {
    if (urlSlugs.length > 0) {
      for (const slug of urlSlugs) {
        addModel(slug)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (contextSlugs.length > 0) {
      const params = encodeCompareParams(contextSlugs)
      router.replace(`/compare?models=${params}`, { scroll: false })
    }
  }, [contextSlugs, router])

  const fetchModels = useCallback(async (slugs: readonly string[]) => {
    if (slugs.length === 0) {
      setModelData([])
      setLoading(false)
      return
    }

    setLoading(true)
    const results = await Promise.all(
      slugs.map(async (slug) => {
        const res = await fetch(`/api/models/${slug}`)
        if (!res.ok) return null
        const json = await res.json()
        return json.success ? json.data : null
      }),
    )
    setModelData(results.filter(Boolean))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchModels(activeSlugs)
  }, [activeSlugs.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = useCallback(
    (slug: string) => {
      removeModel(slug)
      setModelData((prev) => prev.filter((m) => m.slug !== slug))
    },
    [removeModel],
  )

  const handleClearAll = useCallback(() => {
    clearAll()
    setModelData([])
    router.replace('/compare', { scroll: false })
  }, [clearAll, router])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">모델 비교</h1>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          로딩 중...
        </div>
      </div>
    )
  }

  if (modelData.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">모델 비교</h1>
        <EmptyState message="비교할 모델을 선택해주세요. 모델 탐색에서 모델을 추가할 수 있습니다." />
      </div>
    )
  }

  const emptySlots = Math.max(0, 4 - modelData.length)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">모델 비교</h1>
        <div className="flex items-center gap-2">
          <ShareButton />
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            <Trash2 className="mr-1 h-4 w-4" />
            전체 삭제
          </Button>
        </div>
      </div>

      <CompareGrid models={modelData} onRemove={handleRemove} />

      {emptySlots > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: emptySlots }).map((_, i) => (
            <EmptyCompareSlot key={i} onSelect={() => router.push('/explore')} />
          ))}
        </div>
      )}
    </div>
  )
}
