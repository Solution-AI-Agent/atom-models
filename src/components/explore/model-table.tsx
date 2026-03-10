'use client'

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableHeader } from '@/components/shared/sortable-header'
import { ModelTableRow } from '@/components/explore/model-table-row'
import { EmptyState } from '@/components/shared/empty-state'
import { BENCHMARKS } from '@/lib/constants/benchmarks'
import type { IModel } from '@/lib/types/model'

const benchmarkKeys = Object.keys(BENCHMARKS) as readonly (keyof typeof BENCHMARKS)[]

interface ModelTableProps {
  readonly models: readonly IModel[]
  readonly sort?: string
  readonly order?: 'asc' | 'desc'
  readonly onSort?: (field: string) => void
}

export function ModelTable({ models, sort = '', order = 'desc', onSort }: ModelTableProps) {
  if (models.length === 0) {
    return <EmptyState message="조건에 맞는 모델이 없습니다" />
  }

  const handleSort = (field: string) => {
    onSort?.(field)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">비교</TableHead>
          <SortableHeader field="name" currentField={sort} currentOrder={order} onSort={handleSort}>
            모델명
          </SortableHeader>
          <SortableHeader field="provider" currentField={sort} currentOrder={order} onSort={handleSort}>
            제공사
          </SortableHeader>
          <TableHead>유형</TableHead>
          <SortableHeader field="pricing.output" currentField={sort} currentOrder={order} onSort={handleSort}>
            가격
          </SortableHeader>
          {benchmarkKeys.map((key) => (
            <SortableHeader
              key={key}
              field={`benchmarks.${key}`}
              currentField={sort}
              currentOrder={order}
              onSort={handleSort}
            >
              {BENCHMARKS[key].label}
            </SortableHeader>
          ))}
          <SortableHeader field="contextWindow" currentField={sort} currentOrder={order} onSort={handleSort}>
            컨텍스트
          </SortableHeader>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((model) => (
          <ModelTableRow key={model.slug} model={model} />
        ))}
      </TableBody>
    </Table>
  )
}
