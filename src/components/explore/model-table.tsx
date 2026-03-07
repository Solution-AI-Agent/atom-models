'use client'

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ModelTableRow } from '@/components/explore/model-table-row'
import { EmptyState } from '@/components/shared/empty-state'
import type { IModel } from '@/lib/types/model'

interface ModelTableProps {
  readonly models: readonly IModel[]
}

export function ModelTable({ models }: ModelTableProps) {
  if (models.length === 0) {
    return <EmptyState message="조건에 맞는 모델이 없습니다" />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">비교</TableHead>
          <TableHead>모델명</TableHead>
          <TableHead>제공사</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>가격</TableHead>
          <TableHead>평가</TableHead>
          <TableHead>컨텍스트</TableHead>
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
