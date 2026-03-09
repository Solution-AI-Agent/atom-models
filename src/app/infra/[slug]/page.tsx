export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getGpuBySlug, getCompatibleModels } from '@/lib/services/gpu.service'
import { GpuDetailHeader } from '@/components/infra/gpu-detail-header'
import { GpuPricingCard } from '@/components/infra/gpu-pricing-card'
import { GpuSpecsCard } from '@/components/infra/gpu-specs-card'
import { CompatibleModelsTable } from '@/components/infra/compatible-models-table'
import type { IGpuReference, ICompatibleModel } from '@/lib/types/gpu'
import type { Metadata } from 'next'

interface GpuDetailPageProps {
  readonly params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: GpuDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const gpu = await getGpuBySlug(slug)

  if (!gpu) {
    return { title: 'GPU를 찾을 수 없습니다 - Atom Models' }
  }

  return {
    title: `${gpu.name} - 인프라 가이드 - Atom Models`,
    description: `${gpu.name}의 상세 사양, 가격 정보, 배포 가능한 OSS 모델을 확인하세요.`,
  }
}

export default async function GpuDetailPage({ params }: GpuDetailPageProps) {
  const { slug } = await params

  const rawGpu = await getGpuBySlug(slug)

  if (!rawGpu) {
    notFound()
  }

  const gpu = rawGpu as unknown as IGpuReference
  const compatibleModels = await getCompatibleModels(gpu.vram, gpu.fp16Tflops) as unknown as ICompatibleModel[]

  return (
    <div className="flex flex-col gap-6 p-6">
      <GpuDetailHeader gpu={gpu} />

      <div className="grid gap-6 lg:grid-cols-2">
        <GpuSpecsCard gpu={gpu} />
        <GpuPricingCard msrp={gpu.msrp} cloudHourly={gpu.cloudHourly} />
      </div>

      <CompatibleModelsTable models={compatibleModels} />
    </div>
  )
}
