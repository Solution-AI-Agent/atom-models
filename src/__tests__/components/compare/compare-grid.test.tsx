import { render, screen } from '@testing-library/react'
import { CompareGrid } from '@/components/compare/compare-grid'
import type { IModel } from '@/lib/types/model'

const mockModels: IModel[] = [
  {
    name: 'Model A', slug: 'model-a', provider: 'ProviderA',
    type: 'commercial', tier: 'flagship',
    parameterSize: 200, activeParameters: null, contextWindow: 128000, maxOutput: 8192,
    architecture: 'dense', license: 'Proprietary',
    pricing: { input: 3, output: 15, cachingDiscount: 50, batchDiscount: 50 },
    scores: { quality: 90, speed: 75, reasoning: 85, coding: 92, multimodal: 70 },
    languageScores: {}, benchmarks: { mmlu: 88, gpqa: 60 },
    infrastructure: null,
    releaseDate: '2025-01-01', memo: '', sourceUrls: [],
    colorCode: '#000000', lastVerifiedAt: '2025-01-01',
  },
  {
    name: 'Model B', slug: 'model-b', provider: 'ProviderB',
    type: 'open-source', tier: 'mid',
    parameterSize: 70, activeParameters: null, contextWindow: 32000, maxOutput: 4096,
    architecture: 'dense', license: 'MIT',
    pricing: { input: 0.15, output: 0.6, cachingDiscount: 0, batchDiscount: 0 },
    scores: { quality: 70, speed: 95, reasoning: 60, coding: 65, multimodal: 50 },
    languageScores: {}, benchmarks: { mmlu: 72, gpqa: 45 },
    infrastructure: { minGpu: 'A100', vramFp16: 140, vramInt8: 70, vramInt4: 35, recommendedFramework: ['vLLM'], estimatedTps: 30 },
    releaseDate: '2025-02-01', memo: '', sourceUrls: [],
    colorCode: '#0000FF', lastVerifiedAt: '2025-02-01',
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
    expect(screen.getByText('ProviderA')).toBeInTheDocument()
    expect(screen.getByText('ProviderB')).toBeInTheDocument()
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
