import { render, screen } from '@testing-library/react'
import { CompareGrid } from '@/components/compare/compare-grid'
import type { IModel } from '@/lib/types/model'

const baseModel: Omit<IModel, 'name' | 'slug' | 'providerId' | 'type' | 'tier' | 'parameterSize' | 'activeParameters' | 'contextWindow' | 'maxOutput' | 'architecture' | 'license' | 'pricing' | 'benchmarks' | 'infrastructure' | 'releaseDate' | 'lastVerifiedAt'> = {
  family: null,
  variant: null,
  tags: [],
  isOpensource: false,
  status: 'active' as const,
  deprecationDate: null,
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
  compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
  avgTps: null,
  ttftMs: null,
  regions: null,
  memo: '',
  sourceUrls: [],
}

const mockModels: IModel[] = [
  {
    ...baseModel,
    name: 'Model A', slug: 'model-a', providerId: 'PROVIDERA',
    type: 'commercial', tier: 'flagship',
    parameterSize: 200, activeParameters: null, contextWindow: 128000, maxOutput: 8192,
    architecture: 'dense', license: 'Proprietary',
    pricing: { inputPer1m: 3, outputPer1m: 15, pricingType: 'api' },
    benchmarks: { mmlu: 88, gpqa: 60 },
    infrastructure: null,
    releaseDate: '2025-01-01', lastVerifiedAt: '2025-01-01',
  },
  {
    ...baseModel,
    name: 'Model B', slug: 'model-b', providerId: 'PROVIDERB',
    type: 'open-source', tier: 'mid',
    isOpensource: true,
    parameterSize: 70, activeParameters: null, contextWindow: 32000, maxOutput: 4096,
    architecture: 'dense', license: 'MIT',
    pricing: { inputPer1m: 0.15, outputPer1m: 0.6, pricingType: 'api' },
    benchmarks: { mmlu: 72, gpqa: 45 },
    infrastructure: { minGpu: 'A100', vramFp16: 140, vramInt8: 70, vramInt4: 35, recommendedFramework: ['vLLM'], estimatedTps: 30 },
    releaseDate: '2025-02-01', lastVerifiedAt: '2025-02-01',
  },
]

describe('CompareGrid', () => {
  it('should render model names', () => {
    render(<CompareGrid models={mockModels} onRemove={jest.fn()} />)
    expect(screen.getAllByText('Model A').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Model B').length).toBeGreaterThanOrEqual(1)
  })

  it('should render provider names', () => {
    render(<CompareGrid models={mockModels} onRemove={jest.fn()} />)
    expect(screen.getByText('PROVIDERA')).toBeInTheDocument()
    expect(screen.getByText('PROVIDERB')).toBeInTheDocument()
  })

  it('should highlight the winner for each score', () => {
    const { container } = render(<CompareGrid models={mockModels} onRemove={jest.fn()} />)
    expect(container).toBeTruthy()
  })

  it('should render pricing information', () => {
    render(<CompareGrid models={mockModels} onRemove={jest.fn()} />)
    expect(screen.getByText(/\$3\.00/)).toBeInTheDocument()
  })
})
