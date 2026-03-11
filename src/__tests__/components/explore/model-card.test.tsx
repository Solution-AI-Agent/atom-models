import { render, screen } from '@testing-library/react'
import { ModelCard } from '@/components/explore/model-card'

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: () => false, clearAll: jest.fn() }),
}))

const mockModel = {
  name: 'DeepSeek V3.2', slug: 'deepseek-v3-2', providerId: 'DEEPSEEK',
  family: null, variant: null,
  type: 'open-source' as const, tier: 'flagship' as const,
  tags: [],
  isOpensource: true,
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
  parameterSize: 685,
  pricing: { inputPer1m: 0.1, outputPer1m: 0.2, pricingType: 'api' },
  compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
  contextWindow: 163840,
  infrastructure: { minGpu: '8x A100 80GB', vramFp16: 1370, vramInt8: 685, vramInt4: 343, recommendedFramework: ['vLLM', 'SGLang'], estimatedTps: 55 },
  releaseDate: '2025-06-25', isRecentlyReleased: false,
  activeParameters: 37, architecture: 'moe' as const,
  maxOutput: 16384, license: 'MIT',
  benchmarks: {},
  avgTps: null,
  ttftMs: null,
  regions: null,
  memo: '', sourceUrls: [], lastVerifiedAt: '2026-03-01',
}

describe('ModelCard', () => {
  it('should render model name and provider', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText('DeepSeek V3.2')).toBeInTheDocument()
    expect(screen.getByText('DEEPSEEK')).toBeInTheDocument()
  })

  it('should show infrastructure info for open-source models', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText(/8x A100 80GB/)).toBeInTheDocument()
  })

  it('should show parameter size', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText(/685B/)).toBeInTheDocument()
  })
})
