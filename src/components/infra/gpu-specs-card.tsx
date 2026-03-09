import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IGpuReference } from '@/lib/types/gpu'

interface GpuSpecsCardProps {
  readonly gpu: IGpuReference
}

export function GpuSpecsCard({ gpu }: GpuSpecsCardProps) {
  const specs = [
    { label: 'VRAM', value: `${gpu.vram} GB` },
    { label: '메모리 타입', value: gpu.memoryType },
    { label: 'FP16 성능', value: `${gpu.fp16Tflops} TFLOPS` },
    { label: 'INT8 성능', value: `${gpu.int8Tops} TOPS` },
    { label: 'TDP', value: `${gpu.tdp}W` },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>하드웨어 사양</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <div key={spec.label} className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{spec.label}</span>
              <span className="font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
