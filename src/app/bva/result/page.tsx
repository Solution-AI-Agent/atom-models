export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BvaReport } from '@/components/bva/bva-report'
import { getPresetCategories } from '@/lib/services/bva.service'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function BvaResultPage({ searchParams }: PageProps) {
  const params = await searchParams
  const industrySlug = params.industry ?? ''

  const categories = await getPresetCategories()
  const category = categories.find((c) => c.categorySlug === industrySlug)
  const categoryName = category?.category ?? industrySlug

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/bva">
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            BVA 분석
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">BVA 분석 리포트</h1>
        <p className="mt-1 text-muted-foreground">
          비즈니스 가치 평가 기반 모델 추천 결과입니다.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }>
        <BvaReport categoryName={categoryName} />
      </Suspense>
    </div>
  )
}
