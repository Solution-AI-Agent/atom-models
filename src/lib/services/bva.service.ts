import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import { RefBenchmarkModel } from '@/lib/db/models/ref-benchmark'
import { BvaDimensionModel } from '@/lib/db/models/bva-dimension'
import { BvaPresetModel } from '@/lib/db/models/bva-preset'
import { ProviderModel } from '@/lib/db/models/provider'
import {
  calculateDimensionScore,
  calculateCostScore,
} from '@/lib/utils/score'
import { serialize } from '@/lib/utils/serialize'
import type { IModelDocument } from '@/lib/db/models/model'
import type {
  IBvaCustomerProfile,
  IBvaReport,
  IBvaRankedModel,
  IBvaDimensionScore,
  IBvaComplianceCheck,
  IBvaCostEstimate,
  BvaDimensionKey,
  IBvaDimension,
  IRefBenchmark,
} from '@/lib/types/bva'

const MAX_OUTPUT_PRICE = 60
const MAX_PER_PROVIDER = 2

const VOLUME_TOKEN_ESTIMATES: Record<string, { inputTokens: number; outputTokens: number }> = {
  'under-10k':  { inputTokens: 5_000_000,    outputTokens: 2_500_000 },
  '10k-100k':   { inputTokens: 50_000_000,   outputTokens: 25_000_000 },
  '100k-1m':    { inputTokens: 500_000_000,  outputTokens: 250_000_000 },
  'over-1m':    { inputTokens: 5_000_000_000, outputTokens: 2_500_000_000 },
}

function extractBenchmarks(
  benchmarksField: unknown,
): Partial<Record<string, number | null>> {
  if (benchmarksField instanceof Map) {
    const result: Record<string, number | null> = {}
    benchmarksField.forEach((value: number | null, key: string) => {
      result[key] = value
    })
    return result
  }
  return (benchmarksField as Record<string, number | null>) ?? {}
}

function calculateCostEstimate(
  pricing: { inputPer1m: number | null; outputPer1m: number | null },
  modelType: string,
  volumeTier: string,
): IBvaCostEstimate | null {
  if (modelType === 'open-source') return null

  const volume = VOLUME_TOKEN_ESTIMATES[volumeTier]
  if (!volume) return null

  const inputCost = (volume.inputTokens / 1_000_000) * (pricing.inputPer1m ?? 0)
  const outputCost = (volume.outputTokens / 1_000_000) * (pricing.outputPer1m ?? 0)
  const monthlyCost = Math.round((inputCost + outputCost) * 100) / 100
  const totalTokens = volume.inputTokens + volume.outputTokens
  const costPerRequest = totalTokens > 0
    ? Math.round((monthlyCost / (totalTokens / 1000)) * 10000) / 10000
    : 0

  return {
    monthlyTokens: volume.inputTokens + volume.outputTokens,
    monthlyCost,
    costPerRequest,
    currency: 'USD',
  }
}

function buildComplianceChecks(
  model: IModelDocument,
  profile: IBvaCustomerProfile,
): readonly IBvaComplianceCheck[] {
  const checks: IBvaComplianceCheck[] = []

  if (profile.security.onPremiseRequired) {
    checks.push({
      requirement: 'onPremise',
      displayName: '온프레미스 배포',
      met: model.compliance?.onPremise ?? false,
    })
  }

  if (profile.security.personalDataHandling) {
    checks.push(
      {
        requirement: 'gdpr',
        displayName: 'GDPR 준수',
        met: model.compliance?.gdpr ?? false,
      },
      {
        requirement: 'dataExclusion',
        displayName: '데이터 학습 제외',
        met: model.compliance?.dataExclusion ?? false,
      },
    )
  }

  if (profile.security.regulatedIndustry) {
    checks.push(
      {
        requirement: 'soc2',
        displayName: 'SOC2 인증',
        met: model.compliance?.soc2 ?? false,
      },
      {
        requirement: 'hipaa',
        displayName: 'HIPAA 대응',
        met: model.compliance?.hipaa ?? false,
      },
    )
  }

  return checks
}

function diversify(
  models: readonly IBvaRankedModel[],
  limit: number,
): IBvaRankedModel[] {
  const result: IBvaRankedModel[] = []
  const providerCount: Record<string, number> = {}

  for (const model of models) {
    const count = providerCount[model.provider] ?? 0
    if (count < MAX_PER_PROVIDER) {
      result.push(model)
      providerCount[model.provider] = count + 1
    }
    if (result.length >= limit) break
  }

  return result
}

export async function generateBvaReport(
  profile: IBvaCustomerProfile,
): Promise<IBvaReport> {
  await getConnection()

  const [models, dimensions, benchmarkMetas, providers] = await Promise.all([
    ModelModel.find().lean(),
    BvaDimensionModel.find().lean(),
    RefBenchmarkModel.find().lean(),
    ProviderModel.find().lean(),
  ])

  const metaMap = new Map(benchmarkMetas.map((m) => [m._id, m]))
  const providerMap = new Map(providers.map((p) => [p._id, p]))

  const ranked: IBvaRankedModel[] = models.map((model) => {
    const benchmarks = extractBenchmarks(model.benchmarks)

    const dimensionScores: IBvaDimensionScore[] = dimensions.map((dim) => {
      const score = calculateDimensionScore(benchmarks, dim.formula)
      const benchmarkDetails = dim.formula.map((entry) => {
        const meta = metaMap.get(entry.benchmark)
        return {
          benchmark: entry.benchmark,
          benchmarkName: meta?.displayName ?? entry.benchmark,
          score: benchmarks[entry.benchmark] ?? null,
          weight: entry.weight,
        }
      })
      return {
        key: dim.key as BvaDimensionKey,
        displayName: dim.displayName,
        score,
        benchmarkDetails,
      }
    })

    const costScore = calculateCostScore(
      model.pricing,
      model.type as 'commercial' | 'open-source',
    )

    const costEstimate = calculateCostEstimate(
      model.pricing,
      model.type,
      profile.monthlyVolume,
    )

    const complianceChecks = buildComplianceChecks(
      model as unknown as IModelDocument,
      profile,
    )

    // Calculate total score using equal weights for BVA (no preset weights)
    const validDimensions = dimensionScores.filter((d) => d.score != null)
    const dimensionAvg = validDimensions.length > 0
      ? validDimensions.reduce((sum, d) => sum + (d.score ?? 0), 0) / validDimensions.length
      : 0

    // 70% dimension average + 30% cost score
    const totalScore = Math.round((dimensionAvg * 0.7 + costScore * 0.3) * 100) / 100

    const infra = model.type === 'open-source' && model.infrastructure
      ? {
          parameterSize: model.parameterSize ?? null,
          activeParameters: model.activeParameters ?? null,
          architecture: (model.architecture as 'dense' | 'moe') ?? null,
          contextWindow: model.contextWindow,
          license: model.license,
          minGpu: model.infrastructure?.minGpu ?? null,
          vramInt4: model.infrastructure?.vramInt4 ?? null,
          estimatedTps: model.infrastructure?.estimatedTps ?? null,
        }
      : null

    return {
      slug: model.slug,
      name: model.name,
      provider: providerMap.get(model.providerId)?.name ?? model.providerId,
      type: model.type as 'commercial' | 'open-source',
      totalScore,
      dimensionScores,
      costScore,
      costEstimate,
      complianceChecks,
      infra,
    }
  })

  const sorted = ranked.sort((a, b) => b.totalScore - a.totalScore)

  const commercial = diversify(
    sorted.filter((m) => m.type === 'commercial'),
    3,
  )
  const openSource = diversify(
    sorted.filter((m) => m.type === 'open-source'),
    3,
  )

  return serialize({
    profile,
    commercial,
    openSource,
    generatedAt: new Date().toISOString(),
  })
}

export async function getPresetCategories(): Promise<
  readonly { category: string; categorySlug: string }[]
> {
  await getConnection()
  const presets = await BvaPresetModel.find().lean()

  const seen = new Set<string>()
  const categories: { category: string; categorySlug: string }[] = []

  for (const preset of presets) {
    if (!seen.has(preset.categorySlug)) {
      seen.add(preset.categorySlug)
      categories.push({
        category: preset.category,
        categorySlug: preset.categorySlug,
      })
    }
  }

  return categories
}

export async function getAllRefBenchmarks(): Promise<readonly IRefBenchmark[]> {
  await getConnection()
  const metas = await RefBenchmarkModel.find().lean()
  return serialize(metas)
}

export async function getAllBvaDimensions(): Promise<readonly IBvaDimension[]> {
  await getConnection()
  const dimensions = await BvaDimensionModel.find().lean()
  return serialize(dimensions) as unknown as readonly IBvaDimension[]
}
