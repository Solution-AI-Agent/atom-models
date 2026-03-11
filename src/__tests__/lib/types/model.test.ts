import type { IModel, IModelCompliance, IModelPricing, IModelInfrastructure } from '@/lib/types/model'

describe('Model types', () => {
  it('should create a valid model object', () => {
    const model: IModel = {
      name: 'Test Model',
      slug: 'test-model',
      provider: 'TestProvider',
      type: 'commercial',
      tier: 'flagship',
      parameterSize: null,
      activeParameters: null,
      architecture: 'dense',
      contextWindow: 128000,
      maxOutput: 4096,
      license: 'Proprietary',
      pricing: {
        input: 3.0,
        output: 15.0,
        cachingDiscount: 0.9,
        batchDiscount: 0.5,
      },
      compliance: {
        soc2: true,
        hipaa: false,
        gdpr: true,
        onPremise: false,
        dataExclusion: true,
      },
      languageScores: { ko: 85, en: 95 },
      benchmarks: { mmlu: 87.5, gpqa: 72.3, swe_bench: 49.0, kmmlu: 68.0 },
      infrastructure: null,
      releaseDate: '2025-02-24',
      memo: 'Test memo',
      sourceUrls: ['https://example.com'],
      colorCode: '#D97706',
      lastVerifiedAt: '2026-03-01',
    }

    expect(model.name).toBe('Test Model')
    expect(model.slug).toBe('test-model')
    expect(model.pricing.input).toBe(3.0)
    expect(model.compliance.soc2).toBe(true)
    expect(model.compliance.onPremise).toBe(false)
    expect(model.languageScores.ko).toBe(85)
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
      provider: 'TestProvider',
      type: 'commercial',
      tier: 'mid',
      parameterSize: null,
      activeParameters: null,
      architecture: 'dense',
      contextWindow: 32000,
      maxOutput: 4096,
      license: 'Proprietary',
      pricing: { input: 1, output: 5, cachingDiscount: 0, batchDiscount: 0 },
      compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
      languageScores: { ko: 70 },
      benchmarks: { mmlu: 80.0, kmmlu: null },
      infrastructure: null,
      releaseDate: '2025-06-01',
      memo: '',
      sourceUrls: [],
      colorCode: '#333333',
      lastVerifiedAt: '2026-03-01',
    }

    expect(model.benchmarks.kmmlu).toBeNull()
    expect(model.benchmarks.mmlu).toBe(80.0)
  })
})
