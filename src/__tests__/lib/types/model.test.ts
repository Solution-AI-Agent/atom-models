import type { IModel, IModelScores, IModelPricing, IModelInfrastructure } from '@/lib/types/model'

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
      scores: {
        quality: 90,
        speed: 80,
        reasoning: 85,
        coding: 92,
        multimodal: 70,
      },
      languageScores: { ko: 85, en: 95 },
      benchmarks: { mmlu: 87.5, gpqa: 72.3 },
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
    expect(model.scores.quality).toBe(90)
    expect(model.languageScores.ko).toBe(85)
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
})
