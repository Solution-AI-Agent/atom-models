/**
 * @jest-environment node
 */
const mockModels = [
  {
    name: 'Claude 3.5 Sonnet', slug: 'claude-3-5-sonnet', providerId: 'ANTHROPIC',
    type: 'commercial',
    pricing: { inputPer1m: 3, outputPer1m: 15, pricingType: 'pay-per-token' },
    benchmarks: new Map([
      ['mmlu', 88.7], ['gpqa', 65.0], ['swe_bench', 49.0],
      ['aime', 16.0], ['hle', 8.7], ['mgsm', 91.6], ['kmmlu', 68.0],
      ['truthfulqa', 80.0], ['bfcl', 85.0], ['ifeval', 82.0], ['ruler', 90.0],
    ]),
    compliance: { soc2: true, hipaa: false, gdpr: true, onPremise: false, dataExclusion: true },
    infrastructure: null,
  },
  {
    name: 'GPT-4o', slug: 'gpt-4o', providerId: 'OPENAI',
    type: 'commercial',
    pricing: { inputPer1m: 2.5, outputPer1m: 10, pricingType: 'pay-per-token' },
    benchmarks: new Map([
      ['mmlu', 88.7], ['gpqa', 53.6], ['swe_bench', 33.2],
      ['aime', 26.7], ['hle', 3.3], ['mgsm', 90.5], ['kmmlu', null],
      ['truthfulqa', 75.0], ['bfcl', 80.0], ['ifeval', 78.0], ['ruler', 85.0],
    ]),
    compliance: { soc2: true, hipaa: true, gdpr: true, onPremise: false, dataExclusion: false },
    infrastructure: null,
  },
  {
    name: 'Cheap Model', slug: 'cheap-model', providerId: 'OPENAI',
    type: 'commercial',
    pricing: { inputPer1m: 0.15, outputPer1m: 0.6, pricingType: 'pay-per-token' },
    benchmarks: new Map([
      ['mmlu', 70.0], ['gpqa', 40.0], ['swe_bench', 20.0],
      ['aime', 10.0], ['hle', 2.0], ['mgsm', 80.0], ['kmmlu', 50.0],
      ['truthfulqa', 60.0], ['bfcl', 55.0], ['ifeval', 65.0], ['ruler', 70.0],
    ]),
    compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
    infrastructure: null,
  },
  {
    name: 'Third OpenAI', slug: 'third-openai', providerId: 'OPENAI',
    type: 'commercial',
    pricing: { inputPer1m: 5, outputPer1m: 20, pricingType: 'pay-per-token' },
    benchmarks: new Map([
      ['mmlu', 92.0], ['gpqa', 70.0], ['swe_bench', 55.0],
      ['aime', 40.0], ['hle', 12.0], ['mgsm', 93.0], ['kmmlu', 72.0],
      ['truthfulqa', 85.0], ['bfcl', 88.0], ['ifeval', 86.0], ['ruler', 92.0],
    ]),
    compliance: { soc2: true, hipaa: true, gdpr: true, onPremise: false, dataExclusion: true },
    infrastructure: null,
  },
  {
    name: 'OSS Model', slug: 'oss-model', providerId: 'META',
    type: 'open-source',
    pricing: { inputPer1m: 0, outputPer1m: 0, pricingType: 'free' },
    benchmarks: new Map([
      ['mmlu', 75.0], ['gpqa', 45.0], ['swe_bench', 30.0],
      ['aime', 15.0], ['hle', 4.0], ['mgsm', 85.0], ['kmmlu', 55.0],
      ['truthfulqa', 65.0], ['bfcl', 60.0], ['ifeval', 70.0], ['ruler', 75.0],
    ]),
    compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: true, dataExclusion: true },
    parameterSize: 70, activeParameters: 70, architecture: 'dense',
    contextWindow: 128000, license: 'Llama 3.1',
    infrastructure: { minGpu: '1x A100 80GB', vramInt4: 35, estimatedTps: 45 },
  },
]

const mockProviders = [
  { _id: 'ANTHROPIC', name: 'Anthropic' },
  { _id: 'OPENAI', name: 'OpenAI' },
  { _id: 'META', name: 'Meta' },
]

jest.mock('@/lib/db/models/model', () => ({
  ModelModel: {
    find: () => ({ lean: () => Promise.resolve(mockModels) }),
  },
}))

jest.mock('@/lib/db/models/provider', () => ({
  ProviderModel: {
    find: () => ({ lean: () => Promise.resolve(mockProviders) }),
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

import { getRankedModelsForPreset } from '@/lib/services/recommendation.service'

const mockPreset = {
  weights: {
    reasoning: 0.15,
    korean: 0.10,
    coding: 0.10,
    knowledge: 0.10,
    reliability: 0.05,
    toolUse: 0.05,
    instruction: 0.05,
    longContext: 0.05,
    cost: 0.35,
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

  it('should include all BVA dimension keys in breakdown', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any)

    const model = result[0]
    expect(model.breakdown).toHaveProperty('reasoning')
    expect(model.breakdown).toHaveProperty('korean')
    expect(model.breakdown).toHaveProperty('coding')
    expect(model.breakdown).toHaveProperty('knowledge')
    expect(model.breakdown).toHaveProperty('reliability')
    expect(model.breakdown).toHaveProperty('toolUse')
    expect(model.breakdown).toHaveProperty('instruction')
    expect(model.breakdown).toHaveProperty('longContext')
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
    // costScore * weight = 100 * 0.35 = 35
    expect(ossModel!.breakdown.cost).toBeCloseTo(35, 1)
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
