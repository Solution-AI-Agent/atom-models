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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SortableHeader } from '@/components/shared/sortable-header'
import { TpsFormulaInfo } from '@/components/infra/tps-formula-info'
import { useIsMobile } from '@/hooks/use-mobile'
import { QUANTIZATION_LEVELS } from '@/lib/constants/quantizations'
import type { ICompatibleModel, QuantizationLevel } from '@/lib/types/gpu'

interface CompatibleModelsTableProps {
  readonly models: readonly ICompatibleModel[]
}

type SortField = 'name' | 'parameterSize' | 'vramRequired' | 'estimatedTps'
type SortOrder = 'asc' | 'desc'

const quantizationBadgeVariant: Record<QuantizationLevel, 'default' | 'secondary' | 'outline'> = {
  fp16: 'default',
  fp8: 'default',
  int8: 'secondary',
  int4: 'outline',
  q6_k: 'secondary',
  q5_k: 'secondary',
  q4_k_m: 'outline',
  q3_k: 'outline',
  q2_k: 'outline',
}

function formatParams(size: number | null): string {
  if (size === null) return '-'
  return `${size}B`
}

function buildQuantizationTabs(models: readonly ICompatibleModel[]) {
  const presentLevels = new Set(models.map((m) => m.bestQuantization))
  const tabs = QUANTIZATION_LEVELS
    .filter((q) => presentLevels.has(q.key))
    .map((q) => ({ value: q.key, label: q.label }))
  return [{ value: 'all', label: '전체' }, ...tabs]
}

export function CompatibleModelsTable({ models }: CompatibleModelsTableProps) {
  const [filter, setFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('estimatedTps')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const isMobile = useIsMobile()

  const quantizationTabs = useMemo(() => buildQuantizationTabs(models), [models])

  const filteredModels = useMemo(() => {
    const filtered = filter === 'all'
      ? models
      : models.filter((m) => m.bestQuantization === filter)

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
  }, [models, filter, sortField, sortOrder])

  const handleSort = (field: string) => {
    const f = field as SortField
    if (sortField === f) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(f)
      setSortOrder('desc')
    }
  }

  if (models.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">배포 가능한 OSS 모델</h2>
          <Badge variant="secondary">0</Badge>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            이 GPU에서 배포 가능한 모델이 없습니다
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">배포 가능한 OSS 모델</h2>
        <Badge variant="secondary">{filteredModels.length}</Badge>
      </div>

      {models[0]?.tpsFormula && (
        <TpsFormulaInfo formula={models[0].tpsFormula} />
      )}

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {quantizationTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isMobile ? (
        <div className="grid gap-4">
          {filteredModels.map((model) => (
            <Card key={model.slug}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/explore/${model.slug}`}
                      className="font-semibold hover:underline"
                    >
                      {model.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{model.provider}</p>
                  </div>
                  <Badge variant={quantizationBadgeVariant[model.bestQuantization]}>
                    {model.bestQuantization.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">파라미터</span>
                    <p className="font-medium">{formatParams(model.parameterSize)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VRAM</span>
                    <p className="font-medium">{model.vramRequired} GB</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">추정 TPS</span>
                    <p className="font-medium">{model.estimatedTps} tokens/s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name" currentField={sortField} currentOrder={sortOrder} onSort={handleSort}>
                  모델명
                </SortableHeader>
                <TableHead>프로바이더</TableHead>
                <SortableHeader field="parameterSize" currentField={sortField} currentOrder={sortOrder} onSort={handleSort}>
                  파라미터
                </SortableHeader>
                <TableHead>최적 양자화</TableHead>
                <SortableHeader field="vramRequired" currentField={sortField} currentOrder={sortOrder} onSort={handleSort}>
                  VRAM 사용량
                </SortableHeader>
                <SortableHeader field="estimatedTps" currentField={sortField} currentOrder={sortOrder} onSort={handleSort}>
                  추정 TPS
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.map((model) => (
                <TableRow key={model.slug}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/explore/${model.slug}`}
                      className="hover:underline"
                    >
                      {model.name}
                    </Link>
                  </TableCell>
                  <TableCell>{model.provider}</TableCell>
                  <TableCell>{formatParams(model.parameterSize)}</TableCell>
                  <TableCell>
                    <Badge variant={quantizationBadgeVariant[model.bestQuantization]}>
                      {model.bestQuantization.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{model.vramRequired} GB</TableCell>
                  <TableCell>{model.estimatedTps} tokens/s</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
