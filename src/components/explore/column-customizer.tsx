'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SlidersHorizontalIcon } from 'lucide-react'

const COLUMNS = [
  { key: 'type', label: '유형' },
  { key: 'scores', label: '평가' },
  { key: 'context', label: '컨텍스트' },
] as const

type ColumnKey = typeof COLUMNS[number]['key']

interface ColumnCustomizerProps {
  readonly visibleColumns: readonly ColumnKey[]
  readonly onChange: (columns: readonly ColumnKey[]) => void
}

export function ColumnCustomizer({ visibleColumns, onChange }: ColumnCustomizerProps) {
  const toggleColumn = (key: ColumnKey) => {
    const updated = visibleColumns.includes(key)
      ? visibleColumns.filter((c) => c !== key)
      : [...visibleColumns, key]
    onChange(updated)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted hover:text-foreground h-7">
        <SlidersHorizontalIcon className="mr-1 h-4 w-4" />
        컬럼
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {COLUMNS.map((col) => (
          <label
            key={col.key}
            className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={visibleColumns.includes(col.key)}
              onChange={() => toggleColumn(col.key)}
              className="h-4 w-4 rounded border-gray-300"
            />
            {col.label}
          </label>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { COLUMNS }
export type { ColumnKey }
