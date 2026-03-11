import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModelTable } from '@/components/explore/model-table'

const baseFields = {
  family: null,
  variant: null,
  tags: [] as string[],
  isOpensource: false,
  status: 'active' as const,
  deprecationDate: null,
  trainingCutoff: null,
  languages: ['en'] as string[],
  modalityInput: ['text'] as string[],
  modalityOutput: ['text'] as string[],
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
  avgTps: null,
  ttftMs: null,
  regions: null,
}

const mockModelWithBenchmarks = {
  ...baseFields,
  name: 'Claude Sonnet 4.5', slug: 'claude-sonnet-4-5', providerId: 'ANTHROPIC',
  type: 'commercial' as const, tier: 'flagship' as const,
  pricing: { inputPer1m: 3, outputPer1m: 15, pricingType: 'api' },
  compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
  contextWindow: 200000,
  releaseDate: '2025-02-24', isRecentlyReleased: false,
  parameterSize: null, activeParameters: null, architecture: 'dense' as const,
  maxOutput: 8192, license: 'Proprietary',
  benchmarks: { mmlu: 88.7, gpqa: 53.6, swe_bench: 33.2, aime: 26.7, hle: 3.3, mgsm: 90.5 },
  infrastructure: null,
  memo: '', sourceUrls: [], lastVerifiedAt: '2026-03-01',
}

const mockModelNoBenchmarks = {
  ...baseFields,
  name: 'GPT-4o', slug: 'gpt-4o', providerId: 'OPENAI',
  type: 'commercial' as const, tier: 'flagship' as const,
  pricing: { inputPer1m: 5, outputPer1m: 15, pricingType: 'api' },
  compliance: { soc2: false, hipaa: false, gdpr: false, onPremise: false, dataExclusion: false },
  contextWindow: 128000,
  releaseDate: '2025-01-01', isRecentlyReleased: false,
  parameterSize: null, activeParameters: null, architecture: 'dense' as const,
  maxOutput: 16384, license: 'Proprietary',
  benchmarks: {},
  infrastructure: null,
  memo: '', sourceUrls: [], lastVerifiedAt: '2026-03-01',
}

const mockModels = [mockModelWithBenchmarks, mockModelNoBenchmarks]

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: () => false, clearAll: jest.fn() }),
}))

describe('ModelTable', () => {
  it('should render model rows', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument()
    expect(screen.getByText('ANTHROPIC')).toBeInTheDocument()
  })

  it('should render table headers', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.getByText('모델명')).toBeInTheDocument()
    expect(screen.getByText('제공사')).toBeInTheDocument()
    expect(screen.getByText('가격')).toBeInTheDocument()
  })

  it('should render benchmark column headers', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.getByText('MMLU')).toBeInTheDocument()
    expect(screen.getByText('GPQA')).toBeInTheDocument()
    expect(screen.getByText('SWE-bench')).toBeInTheDocument()
    expect(screen.getByText('AIME')).toBeInTheDocument()
    expect(screen.getByText('HLE')).toBeInTheDocument()
    expect(screen.getByText('MGSM')).toBeInTheDocument()
  })

  it('should not render the old scores column header', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.queryByText('평가')).not.toBeInTheDocument()
  })

  it('should display benchmark values for models with data', () => {
    render(<ModelTable models={[mockModelWithBenchmarks]} />)
    expect(screen.getByText('88.7')).toBeInTheDocument()
    expect(screen.getByText('53.6')).toBeInTheDocument()
    expect(screen.getByText('33.2')).toBeInTheDocument()
    expect(screen.getByText('26.7')).toBeInTheDocument()
    expect(screen.getByText('3.3')).toBeInTheDocument()
    expect(screen.getByText('90.5')).toBeInTheDocument()
  })

  it('should display "-" for models without benchmark data', () => {
    render(<ModelTable models={[mockModelNoBenchmarks]} />)
    const dashes = screen.getAllByText('-')
    // Should have at least 6 dashes (one per benchmark column)
    expect(dashes.length).toBeGreaterThanOrEqual(6)
  })

  it('should accept sort, order, and onSort props', () => {
    const onSort = jest.fn()
    render(<ModelTable models={mockModels} sort="name" order="asc" onSort={onSort} />)
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument()
  })

  it('should wrap sortable headers with SortableHeader', () => {
    const onSort = jest.fn()
    render(<ModelTable models={mockModels} sort="benchmarks.mmlu" order="desc" onSort={onSort} />)
    // MMLU header should show active sort indicator (arrow-down for desc)
    expect(screen.getByTestId('icon-arrow-down')).toBeInTheDocument()
  })

  it('should call onSort with correct field when header is clicked', async () => {
    const onSort = jest.fn()
    const user = userEvent.setup()
    render(<ModelTable models={mockModels} sort="name" order="asc" onSort={onSort} />)

    await user.click(screen.getByText('MMLU'))
    expect(onSort).toHaveBeenCalledWith('benchmarks.mmlu')
  })
})
