import { getGpuList } from '@/lib/services/gpu.service'
import { GpuTable } from '@/components/infra/gpu-table'
import type { IGpuReference } from '@/lib/types/gpu'

export default async function InfraPage() {
  const gpus = await getGpuList({})

  const serialized: IGpuReference[] = gpus.map((gpu) => ({
    name: gpu.name,
    vendor: gpu.vendor,
    vram: gpu.vram,
    memoryType: gpu.memoryType,
    fp16Tflops: gpu.fp16Tflops,
    int8Tops: gpu.int8Tops,
    tdp: gpu.tdp,
    msrp: gpu.msrp,
    cloudHourly: gpu.cloudHourly,
    category: gpu.category,
    notes: gpu.notes,
  }))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">인프라 가이드</h1>
        <p className="mt-1 text-muted-foreground">
          GPU 레퍼런스 정보를 확인하고 모델 배포에 필요한 하드웨어를 비교하세요.
        </p>
      </div>

      <GpuTable gpus={serialized} />
    </div>
  )
}
