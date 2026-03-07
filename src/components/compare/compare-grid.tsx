import { CompareCard } from './compare-card'
import {
  CompareSpecsRows,
  ComparePricingRows,
  CompareScoresRows,
  CompareBenchmarkRows,
  CompareInfraRows,
} from './compare-row'
import type { IModel } from '@/lib/types/model'

interface CompareGridProps {
  readonly models: readonly IModel[]
  readonly onRemove: (slug: string) => void
}

function SectionHeader({ title }: { readonly title: string }) {
  return (
    <tr className="border-b bg-muted/50">
      <td colSpan={99} className="px-4 py-2 text-sm font-semibold">
        {title}
      </td>
    </tr>
  )
}

export function CompareGrid({ models, onRemove }: CompareGridProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {models.map((model) => (
          <CompareCard key={model.slug} model={model} onRemove={onRemove} />
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                항목
              </th>
              {models.map((model) => (
                <th key={model.slug} className="px-4 py-3 text-center text-sm font-medium">
                  {model.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionHeader title="기본 스펙" />
            <CompareSpecsRows models={models} />

            <SectionHeader title="가격" />
            <ComparePricingRows models={models} />

            <SectionHeader title="성능 평가" />
            <CompareScoresRows models={models} />

            <SectionHeader title="벤치마크" />
            <CompareBenchmarkRows models={models} />

            <SectionHeader title="인프라 요구사항" />
            <CompareInfraRows models={models} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
