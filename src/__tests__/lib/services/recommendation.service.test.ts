/**
 * @jest-environment node
 */
const mockModels = [
  {
    name: 'Claude 3.5 Sonnet', slug: 'claude-3-5-sonnet', provider: 'Anthropic',
    type: 'commercial',
    pricing: { input: 3, output: 15, cachingDiscount: 0.9, batchDiscount: 0.5 },
    benchmarks: new Map([
      ['mmlu', 88.7], ['gpqa', 65.0], ['swe_bench', 49.0],
      ['aime', 16.0], ['hle', 8.7], ['mgsm', 91.6], ['kmmlu', 68.0],
    ]),
    languageScores: new Map([['ko', 85]]),
    compliance: { soc2: true, hipaa: false, gdpr: true, onPremise: false, dataExclusion: true },
    infrastructure: null,
  },
  {
    name: 'GPT-4o', slug: 'gpt-4o', provider: 'OpenAI',
    type: 'commercial',
    pricing: { input: 2.5, output: 10, cachingDiscount: 0.5, batchDiscount: 0.5 },
    benchmarks: new Map([
      ['mmlu', 88.7], ['gpqa', 53.6], ['swe_bench', 33.2],
      ['aime', 26.7], ['hle', 3.3], ['mgsm', 90.5], ['kmmlu', null],
    ]),
    languageScores: new Map([['ko', 80]]),
    compliance: { soc2: true, hipaa: true, gdpr: true, onPremise: false, dataExclusion: false },
    infrastructure: null,
  },
  {
    name: 'Cheap Model', slug: 'cheap-model', provider: 'OpenAI',
    type: 'commercial',
    pricing: { input: 0.15, output: 0.6, cachingDiscount: 0, batchDiscount: 0 },
    benchmarks: new Map([
      ['mmlu', 70.0], ['gpqa', 40.0], ['swe_bench', 20.0],
      ['aime', 10.0], ['hle', 2.0], ['mgsm', 80.0], ['kmmlu', 50.0],
    ]),
    languageScores: new Map([['ko', 70]]),
    compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
    infrastructure: null,
  },
  {
    name: 'Third OpenAI', slug: 'third-openai', provider: 'OpenAI',
    type: 'commercial',
    pricing: { input: 5, output: 20, cachingDiscount: 0, batchDiscount: 0 },
    benchmarks: new Map([
      ['mmlu', 92.0], ['gpqa', 70.0], ['swe_bench', 55.0],
      ['aime', 40.0], ['hle', 12.0], ['mgsm', 93.0], ['kmmlu', 72.0],
    ]),
    languageScores: new Map([['ko', 90]]),
    compliance: { soc2: true, hipaa: true, gdpr: true, onPremise: false, dataExclusion: true },
    infrastructure: null,
  },
  {
    name: 'OSS Model', slug: 'oss-model', provider: 'Meta',
    type: 'open-source',
    pricing: { input: 0, output: 0, cachingDiscount: 0, batchDiscount: 0 },
    benchmarks: new Map([
      ['mmlu', 75.0], ['gpqa', 45.0], ['swe_bench', 30.0],
      ['aime', 15.0], ['hle', 4.0], ['mgsm', 85.0], ['kmmlu', 55.0],
    ]),
    languageScores: new Map([['ko', 75]]),
    compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: true, dataExclusion: true },
    parameterSize: 70, activeParameters: 70, architecture: 'dense',
    contextWindow: 128000, license: 'Llama 3.1',
    infrastructure: { minGpu: '1x A100 80GB', vramInt4: 35, estimatedTps: 45 },
  },
]

jest.mock('@/lib/db/models/model', () => ({
  ModelModel: {
    find: () => ({ lean: () => Promise.resolve(mockModels) }),
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

import { getRankedModelsForPreset } from '@/lib/services/recommendation.service'

const mockPreset = {
  weights: {
    reasoning: 0.25,
    korean: 0.20,
    coding: 0.15,
    knowledge: 0.15,
    cost: 0.25,
  },
}

describe('Recommendation Service', () => {
  it('should rank models by fitness score', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    expect(result.length).toBeGreaterThan(0)
    expect(result[0].slug).toBeDefined()
    expect(result[0].score).toBeGreaterThan(0)
    expect(result[0].breakdown).toBeDefined()
  })

  it('should include BVA dimension keys in breakdown', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const model = result[0]
    expect(model.breakdown).toHaveProperty('reasoning')
    expect(model.breakdown).toHaveProperty('korean')
    expect(model.breakdown).toHaveProperty('coding')
    expect(model.breakdown).toHaveProperty('knowledge')
    expect(model.breakdown).toHaveProperty('cost')
  })

  it('should not include old dimension keys in breakdown', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const model = result[0]
    expect(model.breakdown).not.toHaveProperty('quality')
    expect(model.breakdown).not.toHaveProperty('speed')
    expect(model.breakdown).not.toHaveProperty('multimodal')
  })

  it('should limit to max 2 models per provider', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const providerCounts: Record<string, number> = {}
    for (const model of result) {
      providerCounts[model.provider] = (providerCounts[model.provider] ?? 0) + 1
    }

    for (const count of Object.values(providerCounts)) {
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('should give OSS models costScore of 100', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const ossModel = result.find((m) => m.type === 'open-source')
    expect(ossModel).toBeDefined()
    // costScore * weight = 100 * 0.25 = 25
    expect(ossModel!.breakdown.cost).toBeCloseTo(25, 1)
  })

  it('should include infra for open-source models only', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const commercial = result.find((m) => m.type === 'commercial')
    const oss = result.find((m) => m.type === 'open-source')

    expect(commercial?.infra).toBeNull()
    expect(oss?.infra).not.toBeNull()
    expect(oss?.infra?.minGpu).toBe('1x A100 80GB')
  })

  it('should include models from multiple providers when available', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const providers = new Set(result.map((m) => m.provider))
    expect(providers.size).toBeGreaterThan(1)
  })

  it('should separate commercial and OSS in output', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const types = new Set(result.map((m) => m.type))
    expect(types.has('commercial')).toBe(true)
    expect(types.has('open-source')).toBe(true)
  })
})
