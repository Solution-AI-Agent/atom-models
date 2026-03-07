export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getModelBySlug, getSimilarModels } from '@/lib/services/model.service'
import { ModelHeader } from '@/components/detail/model-header'
import { SpecsSection } from '@/components/detail/specs-section'
import { ScoreOverview } from '@/components/detail/score-overview'
import { BenchmarkChart } from '@/components/detail/benchmark-chart'
import { PricingSection } from '@/components/detail/pricing-section'
import { InfraSection } from '@/components/detail/infra-section'
import { SimilarModels } from '@/components/detail/similar-models'
import type { Metadata } from 'next'
import type { IModel } from '@/lib/types/model'

interface ModelDetailPageProps {
  readonly params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ModelDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const model = await getModelBySlug(slug)

  if (!model) {
    return { title: '모델을 찾을 수 없습니다 - Atom Models' }
  }

  return {
    title: `${model.name} - Atom Models`,
    description: `${model.provider}의 ${model.name} 모델 상세 정보. 벤치마크, 가격, 인프라 요구사항을 확인하세요.`,
  }
}

export default async function ModelDetailPage({ params }: ModelDetailPageProps) {
  const { slug } = await params

  const [rawModel, similarModels] = await Promise.all([
    getModelBySlug(slug),
    getSimilarModels(slug),
  ])

  if (!rawModel) {
    notFound()
  }

  const model = rawModel as unknown as IModel

  return (
    <div className="flex flex-col gap-6">
      <ModelHeader model={model} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SpecsSection
          architecture={model.architecture}
          parameterSize={model.parameterSize}
          activeParameters={model.activeParameters}
          contextWindow={model.contextWindow}
          maxOutput={model.maxOutput}
          license={model.license}
        />
        <ScoreOverview scores={model.scores} />
      </div>

      <BenchmarkChart benchmarks={model.benchmarks} />
      <PricingSection pricing={model.pricing} />

      {model.type === 'open-source' && model.infrastructure && (
        <InfraSection infrastructure={model.infrastructure} />
      )}

      <SimilarModels models={similarModels as unknown as IModel[]} />
    </div>
  )
}
