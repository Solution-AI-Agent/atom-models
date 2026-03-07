import { render, screen } from '@testing-library/react'
import { ModelCard } from '@/components/explore/model-card'

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: () => false, clearAll: jest.fn() }),
}))

const mockModel = {
  name: 'Llama 4 Maverick', slug: 'llama-4-maverick', provider: 'Meta',
  type: 'open-source' as const, tier: 'flagship' as const, parameterSize: 400,
  pricing: { input: 0.2, output: 0.6, cachingDiscount: 0, batchDiscount: 0 },
  scores: { quality: 80, speed: 88, reasoning: 72, coding: 75, multimodal: 78 },
  contextWindow: 1048576,
  infrastructure: { minGpu: '4x A100 80GB', vramFp16: 280, vramInt8: 140, vramInt4: 70, recommendedFramework: ['vLLM'], estimatedTps: 45 },
  releaseDate: '2025-04-05', isRecentlyReleased: false,
  activeParameters: 17, architecture: 'moe' as const,
  maxOutput: 16384, license: 'Llama 4 Community',
  languageScores: {}, benchmarks: {},
  memo: '', sourceUrls: [], colorCode: '#3B82F6', lastVerifiedAt: '2026-03-01',
}

describe('ModelCard', () => {
  it('should render model name and provider', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText('Llama 4 Maverick')).toBeInTheDocument()
    expect(screen.getByText('Meta')).toBeInTheDocument()
  })

  it('should show infrastructure info for open-source models', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText(/4x A100 80GB/)).toBeInTheDocument()
  })

  it('should show parameter size', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText(/400B/)).toBeInTheDocument()
  })
})
