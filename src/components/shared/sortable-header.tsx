'use client'

import { TableHead } from '@/components/ui/table'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface SortableHeaderProps {
  readonly field: string
  readonly currentField: string
  readonly currentOrder: 'asc' | 'desc'
  readonly onSort: (field: string) => void
  readonly children: React.ReactNode
}

function SortIcon({ field, currentField, currentOrder }: {
  readonly field: string
  readonly currentField: string
  readonly currentOrder: 'asc' | 'desc'
}) {
  if (field !== currentField) {
    return <ArrowUpDown data-testid="icon-arrow-up-down" className="h-3 w-3" />
  }
  if (currentOrder === 'asc') {
    return <ArrowUp data-testid="icon-arrow-up" className="h-3 w-3" />
  }
  return <ArrowDown data-testid="icon-arrow-down" className="h-3 w-3" />
}

export function SortableHeader({
  field,
  currentField,
  currentOrder,
  onSort,
  children,
}: SortableHeaderProps) {
  return (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon field={field} currentField={currentField} currentOrder={currentOrder} />
      </div>
    </TableHead>
  )
}
