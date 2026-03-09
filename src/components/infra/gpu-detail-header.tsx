import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import type { IGpuReference } from '@/lib/types/gpu'

interface GpuDetailHeaderProps {
  readonly gpu: IGpuReference
}

const categoryLabels: Record<string, string> = {
  datacenter: '데이터센터',
  consumer: '컨슈머',
  workstation: '워크스테이션',
}

export function GpuDetailHeader({ gpu }: GpuDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/infra"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        인프라 가이드
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">{gpu.name}</h1>
          <Badge variant="outline">
            {categoryLabels[gpu.category] || gpu.category}
          </Badge>
        </div>
        <p className="text-muted-foreground">{gpu.vendor}</p>
        {gpu.notes && (
          <p className="text-sm text-muted-foreground">{gpu.notes}</p>
        )}
      </div>
    </div>
  )
}
