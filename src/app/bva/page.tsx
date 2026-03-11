export const dynamic = 'force-dynamic'

import { getPresetCategories } from '@/lib/services/bva.service'
import { BvaForm } from '@/components/bva/bva-form'

export default async function BvaPage() {
  const categories = await getPresetCategories()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">BVA 분석</h1>
        <p className="mt-1 text-muted-foreground">
          비즈니스 맥락을 입력하면 최적의 LLM 모델을 추천해 드립니다.
        </p>
      </div>

      <div className="max-w-2xl">
        <BvaForm categories={categories} />
      </div>
    </div>
  )
}
