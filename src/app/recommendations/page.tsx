export const dynamic = 'force-dynamic'

import { getPresetCategories } from '@/lib/services/preset.service'
import { IndustryCategoryList } from '@/components/recommendations/industry-category-list'

export default async function RecommendationsPage() {
  const categories = await getPresetCategories()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">산업별 추천</h1>
        <p className="mt-1 text-muted-foreground">
          산업과 업무 유형에 맞는 최적의 LLM을 찾아보세요.
        </p>
      </div>

      <IndustryCategoryList categories={categories} />
    </div>
  )
}
