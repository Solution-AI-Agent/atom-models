import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { IGpuReference } from '@/lib/types/gpu'

interface GpuCardProps {
  readonly gpu: IGpuReference
}

const categoryLabels: Record<string, string> = {
  datacenter: '데이터센터',
  consumer: '컨슈머',
  workstation: '워크스테이션',
}

export function GpuCard({ gpu }: GpuCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/infra/${gpu.slug}`} className="hover:underline">
              <h3 className="font-semibold">{gpu.name}</h3>
            </Link>
            <p className="text-sm text-muted-foreground">{gpu.vendor}</p>
          </div>
          <Badge variant="outline">{categoryLabels[gpu.category] || gpu.category}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">VRAM</span>
            <p className="font-medium">{gpu.vram} GB</p>
          </div>
          <div>
            <span className="text-muted-foreground">메모리</span>
            <p className="font-medium">{gpu.memoryType}</p>
          </div>
          <div>
            <span className="text-muted-foreground">FP16</span>
            <p className="font-medium">{gpu.fp16Tflops} TFLOPS</p>
          </div>
          <div>
            <span className="text-muted-foreground">TDP</span>
            <p className="font-medium">{gpu.tdp}W</p>
          </div>
          <div>
            <span className="text-muted-foreground">MSRP</span>
            <p className="font-medium">${gpu.msrp.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">클라우드</span>
            <p className="font-medium">${gpu.cloudHourly.toFixed(2)}/h</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
