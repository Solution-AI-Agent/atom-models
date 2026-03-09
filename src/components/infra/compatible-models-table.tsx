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
import { ArrowUpDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import type { ICompatibleModel, QuantizationLevel } from '@/lib/types/gpu'

interface CompatibleModelsTableProps {
  readonly models: readonly ICompatibleModel[]
}

const quantizationTabs: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'fp16', label: 'FP16' },
  { value: 'int8', label: 'INT8' },
  { value: 'int4', label: 'INT4' },
]

const quantizationBadgeVariant: Record<QuantizationLevel, 'default' | 'secondary' | 'outline'> = {
  fp16: 'default',
  int8: 'secondary',
  int4: 'outline',
}

function formatParams(size: number | null): string {
  if (size === null) return '-'
  return `${size}B`
}

export function CompatibleModelsTable({ models }: CompatibleModelsTableProps) {
  const [filter, setFilter] = useState('all')
  const [sortAsc, setSortAsc] = useState(false)
  const isMobile = useIsMobile()

  const filteredModels = useMemo(() => {
    const filtered = filter === 'all'
      ? models
      : models.filter((m) => m.bestQuantization === filter)

    return [...filtered].sort((a, b) =>
      sortAsc ? a.estimatedTps - b.estimatedTps : b.estimatedTps - a.estimatedTps
    )
  }, [models, filter, sortAsc])

  const handleSortToggle = () => {
    setSortAsc((prev) => !prev)
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
                <TableHead>모델명</TableHead>
                <TableHead>프로바이더</TableHead>
                <TableHead>파라미터</TableHead>
                <TableHead>최적 양자화</TableHead>
                <TableHead>VRAM 사용량</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={handleSortToggle}
                >
                  <div className="flex items-center gap-1">
                    추정 TPS
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
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
