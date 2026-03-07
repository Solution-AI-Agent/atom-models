import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CpuIcon } from 'lucide-react'
import type { IModelInfrastructure } from '@/lib/types/model'

interface InfraSectionProps {
  readonly infrastructure: IModelInfrastructure
}

export function InfraSection({ infrastructure }: InfraSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CpuIcon className="h-5 w-5" />
          인프라 요구사항
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">최소 GPU</span>
            <span className="font-medium">{infrastructure.minGpu}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">VRAM (FP16)</span>
            <span className="font-medium">{infrastructure.vramFp16} GB</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">VRAM (INT8)</span>
            <span className="font-medium">{infrastructure.vramInt8} GB</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">VRAM (INT4)</span>
            <span className="font-medium">{infrastructure.vramInt4} GB</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">예상 TPS</span>
            <span className="font-medium">{infrastructure.estimatedTps} tokens/s</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">권장 프레임워크</span>
            <div className="flex flex-wrap gap-1">
              {infrastructure.recommendedFramework.map((fw) => (
                <Badge key={fw} variant="secondary">{fw}</Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
