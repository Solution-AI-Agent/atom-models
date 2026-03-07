import { render, screen } from '@testing-library/react'
import { ModelTable } from '@/components/explore/model-table'

const mockModels = [
  {
    name: 'Claude Sonnet 4.5', slug: 'claude-sonnet-4-5', provider: 'Anthropic',
    type: 'commercial' as const, tier: 'flagship' as const,
    pricing: { input: 3, output: 15, cachingDiscount: 0.9, batchDiscount: 0.5 },
    scores: { quality: 92, speed: 75, reasoning: 90, coding: 95, multimodal: 85 },
    contextWindow: 200000,
    releaseDate: '2025-02-24', isRecentlyReleased: false,
    parameterSize: null, activeParameters: null, architecture: 'dense' as const,
    maxOutput: 8192, license: 'Proprietary',
    languageScores: {}, benchmarks: {},
    infrastructure: null,
    memo: '', sourceUrls: [], colorCode: '#D97706', lastVerifiedAt: '2026-03-01',
  },
]

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: () => false, clearAll: jest.fn() }),
}))

describe('ModelTable', () => {
  it('should render model rows', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
  })

  it('should render table headers', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.getByText('모델명')).toBeInTheDocument()
    expect(screen.getByText('제공사')).toBeInTheDocument()
    expect(screen.getByText('가격')).toBeInTheDocument()
  })
})
