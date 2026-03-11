import type { IModel, IModelCompliance, IModelPricing, IModelInfrastructure } from '@/lib/types/model'

describe('Model types', () => {
  it('should create a valid model object', () => {
    const model: IModel = {
      name: 'Test Model',
      slug: 'test-model',
      providerId: 'TESTPROVIDER',
      family: null,
      variant: null,
      type: 'commercial',
      tier: 'flagship',
      tags: [],
      isOpensource: false,
      status: 'active',
      deprecationDate: null,
      parameterSize: null,
      activeParameters: null,
      architecture: 'dense',
      contextWindow: 128000,
      maxOutput: 4096,
      trainingCutoff: null,
      languages: ['en', 'ko'],
      modalityInput: ['text'],
      modalityOutput: ['text'],
      capabilities: {
        functionCalling: false,
        structuredOutput: false,
        streaming: true,
        systemPrompt: true,
        vision: false,
        toolUse: false,
        fineTuning: false,
        batchApi: false,
        thinkingMode: false,
      },
      license: 'Proprietary',
      pricing: {
        inputPer1m: 3.0,
        outputPer1m: 15.0,
        pricingType: 'api',
      },
      compliance: {
        soc2: true,
        hipaa: false,
        gdpr: true,
        onPremise: false,
        dataExclusion: true,
      },
      benchmarks: { mmlu: 87.5, gpqa: 72.3, swe_bench: 49.0, kmmlu: 68.0 },
      avgTps: null,
      ttftMs: null,
      regions: null,
      infrastructure: null,
      releaseDate: '2025-02-24',
      memo: 'Test memo',
      sourceUrls: ['https://example.com'],
      lastVerifiedAt: '2026-03-01',
    }

    expect(model.name).toBe('Test Model')
    expect(model.slug).toBe('test-model')
    expect(model.pricing.inputPer1m).toBe(3.0)
    expect(model.compliance.soc2).toBe(true)
    expect(model.compliance.onPremise).toBe(false)
    expect(model.benchmarks.kmmlu).toBe(68.0)
  })

  it('should allow open-source model with infrastructure', () => {
    const infra: IModelInfrastructure = {
      minGpu: '1x A100 80GB',
      vramFp16: 140,
      vramInt8: 70,
      vramInt4: 35,
      recommendedFramework: ['vLLM'],
      estimatedTps: 45,
    }

    expect(infra.vramFp16).toBe(140)
    expect(infra.recommendedFramework).toContain('vLLM')
  })

  it('should allow null benchmarks for missing data', () => {
    const model: IModel = {
      name: 'Partial Model',
      slug: 'partial-model',
      providerId: 'TESTPROVIDER',
      family: null,
      variant: null,
      type: 'commercial',
      tier: 'mid',
      tags: [],
      isOpensource: false,
      status: 'active',
      deprecationDate: null,
      parameterSize: null,
      activeParameters: null,
      architecture: 'dense',
      contextWindow: 32000,
      maxOutput: 4096,
      trainingCutoff: null,
      languages: ['en'],
      modalityInput: ['text'],
      modalityOutput: ['text'],
      capabilities: {
        functionCalling: false,
        structuredOutput: false,
        streaming: true,
        systemPrompt: true,
        vision: false,
        toolUse: false,
        fineTuning: false,
        batchApi: false,
        thinkingMode: false,
      },
      license: 'Proprietary',
      pricing: { inputPer1m: 1, outputPer1m: 5, pricingType: 'api' },
      compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
      benchmarks: { mmlu: 80.0, kmmlu: null },
      avgTps: null,
      ttftMs: null,
      regions: null,
      infrastructure: null,
      releaseDate: '2025-06-01',
      memo: '',
      sourceUrls: [],
      lastVerifiedAt: '2026-03-01',
    }

    expect(model.benchmarks.kmmlu).toBeNull()
    expect(model.benchmarks.mmlu).toBe(80.0)
  })
})
