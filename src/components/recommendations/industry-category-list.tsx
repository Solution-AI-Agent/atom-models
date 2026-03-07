import { IndustryCategoryCard } from './industry-category-card'

interface CategoryInfo {
  readonly category: string
  readonly categorySlug: string
  readonly count: number
}

interface IndustryCategoryListProps {
  readonly categories: readonly CategoryInfo[]
}

export function IndustryCategoryList({ categories }: IndustryCategoryListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => (
        <IndustryCategoryCard
          key={cat.categorySlug}
          category={cat.category}
          categorySlug={cat.categorySlug}
          count={cat.count}
        />
      ))}
    </div>
  )
}
