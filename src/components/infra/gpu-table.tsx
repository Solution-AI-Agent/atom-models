'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GpuCard } from './gpu-card'
import { SortableHeader } from '@/components/shared/sortable-header'
import { useIsMobile } from '@/hooks/use-mobile'
import type { IGpuReference, GpuCategory } from '@/lib/types/gpu'

interface GpuTableProps {
  readonly gpus: readonly IGpuReference[]
}

type SortField = 'name' | 'vram' | 'fp16Tflops' | 'tdp' | 'msrp' | 'cloudHourly'
type SortOrder = 'asc' | 'desc'

const categoryTabs: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'datacenter', label: '데이터센터' },
  { value: 'consumer', label: '컨슈머' },
  { value: 'workstation', label: '워크스테이션' },
]

export function GpuTable({ gpus }: GpuTableProps) {
  const [category, setCategory] = useState('all')
  const [sortField, setSortField] = useState<SortField>('vram')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const isMobile = useIsMobile()

  const filteredGpus = useMemo(() => {
    const filtered = category === 'all'
      ? gpus
      : gpus.filter((g) => g.category === category)

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const aNum = typeof aVal === 'number' ? aVal : 0
      const bNum = typeof bVal === 'number' ? bVal : 0
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum
    })
  }, [gpus, category, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const renderSortableHeader = (field: SortField, children: React.ReactNode) => (
    <SortableHeader
      field={field}
      currentField={sortField}
      currentOrder={sortOrder}
      onSort={(f) => handleSort(f as SortField)}
    >
      {children}
    </SortableHeader>
  )

  return (
    <div className="space-y-4">
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList>
          {categoryTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isMobile ? (
        <div className="grid gap-4">
          {filteredGpus.map((gpu) => (
            <GpuCard key={gpu.name} gpu={gpu} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {renderSortableHeader('name', '이름')}
                <TableHead>벤더</TableHead>
                {renderSortableHeader('vram', 'VRAM')}
                <TableHead>메모리</TableHead>
                {renderSortableHeader('fp16Tflops', 'FP16')}
                {renderSortableHeader('tdp', 'TDP')}
                {renderSortableHeader('msrp', 'MSRP')}
                {renderSortableHeader('cloudHourly', '클라우드')}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGpus.map((gpu) => (
                <TableRow key={gpu.name}>
                  <TableCell className="font-medium">
                    <Link href={`/infra/${gpu.slug}`} className="hover:underline">
                      {gpu.name}
                    </Link>
                  </TableCell>
                  <TableCell>{gpu.vendor}</TableCell>
                  <TableCell>{gpu.vram} GB</TableCell>
                  <TableCell>{gpu.memoryType}</TableCell>
                  <TableCell>{gpu.fp16Tflops} TFLOPS</TableCell>
                  <TableCell>{gpu.tdp}W</TableCell>
                  <TableCell>${gpu.msrp.toLocaleString()}</TableCell>
                  <TableCell>${gpu.cloudHourly.toFixed(2)}/h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
