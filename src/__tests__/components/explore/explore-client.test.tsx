import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExploreClient } from '@/components/explore/explore-client'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('sort=benchmarks.mmlu&order=desc'),
}))

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: () => false, clearAll: jest.fn() }),
}))

const mockModel = {
  name: 'Claude Sonnet 4.5', slug: 'claude-sonnet-4-5', providerId: 'ANTHROPIC',
  family: null, variant: null,
  type: 'commercial' as const, tier: 'flagship' as const,
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
  pricing: { inputPer1m: 3, outputPer1m: 15, pricingType: 'api' },
  compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
  contextWindow: 200000,
  releaseDate: '2025-02-24', isRecentlyReleased: false,
  parameterSize: null, activeParameters: null, architecture: 'dense' as const,
  maxOutput: 8192, license: 'Proprietary',
  benchmarks: { mmlu: 88.7 },
  infrastructure: null,
  avgTps: null,
  ttftMs: null,
  regions: null,
  memo: '', sourceUrls: [], lastVerifiedAt: '2026-03-01',
}

describe('ExploreClient', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('should pass sort and order from URL params to ModelTable', () => {
    render(<ExploreClient models={[mockModel]} total={1} page={1} limit={20} />)
    // The MMLU header should show active sort (desc -> arrow-down icon)
    expect(screen.getByTestId('icon-arrow-down')).toBeInTheDocument()
  })

  it('should update URL when a sort header is clicked', async () => {
    const user = userEvent.setup()
    render(<ExploreClient models={[mockModel]} total={1} page={1} limit={20} />)

    // Click on GPQA header (different from current sort field)
    await user.click(screen.getByText('GPQA'))
    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('sort=benchmarks.gpqa')
    expect(url).toContain('order=desc')
  })

  it('should toggle order when same sort field is clicked', async () => {
    const user = userEvent.setup()
    render(<ExploreClient models={[mockModel]} total={1} page={1} limit={20} />)

    // Click MMLU header (same as current sort field benchmarks.mmlu)
    await user.click(screen.getByText('MMLU'))
    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('sort=benchmarks.mmlu')
    expect(url).toContain('order=asc')
  })
})
