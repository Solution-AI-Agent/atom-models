import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompatibleModelsTable } from '@/components/infra/compatible-models-table'
import type { ICompatibleModel } from '@/lib/types/gpu'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
})

const mockModels: readonly ICompatibleModel[] = [
  {
    name: 'Qwen3 32B', slug: 'qwen3-32b', provider: 'Alibaba Cloud',
    parameterSize: 32, architecture: 'dense',
    bestQuantization: 'int4', vramRequired: 18, estimatedTps: 45,
    allQuantizations: [
      { level: 'fp16', vramRequired: 64, fits: false },
      { level: 'int8', vramRequired: 32, fits: false },
      { level: 'int4', vramRequired: 18, fits: true },
    ],
    tpsFormula: { baseTps: 35, refGpuName: 'NVIDIA RTX 4090', refTflops: 165, targetTflops: 210, ratio: 1.273 },
  },
  {
    name: 'Llama 3.3 8B', slug: 'llama-3-3-8b', provider: 'Meta',
    parameterSize: 8, architecture: 'dense',
    bestQuantization: 'fp16', vramRequired: 16, estimatedTps: 80,
    allQuantizations: [
      { level: 'fp16', vramRequired: 16, fits: true },
      { level: 'int8', vramRequired: 8, fits: true },
      { level: 'int4', vramRequired: 5, fits: true },
    ],
    tpsFormula: { baseTps: 80, refGpuName: 'NVIDIA RTX 4090', refTflops: 165, targetTflops: 165, ratio: 1 },
  },
  {
    name: 'Gemma 2 9B', slug: 'gemma-2-9b', provider: 'Google',
    parameterSize: 9, architecture: 'dense',
    bestQuantization: 'int8', vramRequired: 10, estimatedTps: 60,
    allQuantizations: [
      { level: 'fp16', vramRequired: 18, fits: false },
      { level: 'int8', vramRequired: 10, fits: true },
      { level: 'int4', vramRequired: 6, fits: true },
    ],
    tpsFormula: { baseTps: 60, refGpuName: 'NVIDIA RTX 4090', refTflops: 165, targetTflops: 165, ratio: 1 },
  },
]

describe('CompatibleModelsTable', () => {
  it('should render model names', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    expect(screen.getByText('Qwen3 32B')).toBeInTheDocument()
    expect(screen.getByText('Llama 3.3 8B')).toBeInTheDocument()
    expect(screen.getByText('Gemma 2 9B')).toBeInTheDocument()
  })

  it('should render title with model count badge', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    expect(screen.getByText('배포 가능한 OSS 모델')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should render table headers on desktop', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    expect(screen.getByText('모델명')).toBeInTheDocument()
    expect(screen.getByText('프로바이더')).toBeInTheDocument()
    expect(screen.getByText('최적 양자화')).toBeInTheDocument()
  })

  it('should render quantization badges in table cells', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    const badges = screen.getAllByText(/^(FP16|INT8|INT4)$/)
    // 3 badges in table + 3 filter tabs = at least 6
    expect(badges.length).toBeGreaterThanOrEqual(6)
  })

  it('should render VRAM and TPS values', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    expect(screen.getByText('16 GB')).toBeInTheDocument()
    expect(screen.getByText('80 tokens/s')).toBeInTheDocument()
  })

  it('should render links to model detail pages', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/explore/qwen3-32b')
    expect(hrefs).toContain('/explore/llama-3-3-8b')
  })

  it('should show empty state when no models', () => {
    render(<CompatibleModelsTable models={[]} />)
    expect(screen.getByText('이 GPU에서 배포 가능한 모델이 없습니다')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should render filter tabs', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    expect(screen.getByRole('tab', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'FP16' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'INT8' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'INT4' })).toBeInTheDocument()
  })

  it('should filter models by quantization tab', async () => {
    const user = userEvent.setup()
    render(<CompatibleModelsTable models={mockModels} />)

    await user.click(screen.getByRole('tab', { name: 'FP16' }))
    expect(screen.getByText('Llama 3.3 8B')).toBeInTheDocument()
    expect(screen.queryByText('Qwen3 32B')).not.toBeInTheDocument()
    expect(screen.queryByText('Gemma 2 9B')).not.toBeInTheDocument()
  })

  it('should show parameter sizes', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    expect(screen.getByText('32B')).toBeInTheDocument()
    expect(screen.getByText('8B')).toBeInTheDocument()
  })

  it('should handle null parameterSize', () => {
    const modelsWithNull: readonly ICompatibleModel[] = [{
      ...mockModels[0],
      parameterSize: null,
    }]
    render(<CompatibleModelsTable models={modelsWithNull} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('should use SortableHeader for sortable columns', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    // All sortable columns should render sort icons (arrow-up-down for inactive)
    const sortIcons = screen.getAllByTestId('icon-arrow-up-down')
    // At least model name, params, VRAM, TPS columns are sortable
    expect(sortIcons.length).toBeGreaterThanOrEqual(3)
  })

  it('should sort by model name when name header is clicked', async () => {
    const user = userEvent.setup()
    render(<CompatibleModelsTable models={mockModels} />)

    await user.click(screen.getByText('모델명'))
    // After clicking, a sort direction icon should appear
    const activeIcons = screen.queryAllByTestId('icon-arrow-down')
    expect(activeIcons.length).toBeGreaterThanOrEqual(1)
  })

  it('should render quantization tabs from QUANTIZATION_LEVELS', () => {
    const modelsWithFp8: readonly ICompatibleModel[] = [
      ...mockModels,
      {
        name: 'Test FP8', slug: 'test-fp8', provider: 'Test',
        parameterSize: 7, architecture: 'dense',
        bestQuantization: 'fp8', vramRequired: 14, estimatedTps: 70,
        allQuantizations: [
          { level: 'fp8', vramRequired: 14, fits: true },
        ],
        tpsFormula: null,
      },
    ]
    render(<CompatibleModelsTable models={modelsWithFp8} />)
    expect(screen.getByRole('tab', { name: 'FP8' })).toBeInTheDocument()
  })

  it('should only show tabs for quantization levels present in data', () => {
    render(<CompatibleModelsTable models={mockModels} />)
    // mockModels have fp16, int8, int4 as bestQuantization
    expect(screen.getByRole('tab', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'FP16' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'INT8' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'INT4' })).toBeInTheDocument()
    // FP8 should NOT be a tab since no model uses it
    expect(screen.queryByRole('tab', { name: 'FP8' })).not.toBeInTheDocument()
  })
})
