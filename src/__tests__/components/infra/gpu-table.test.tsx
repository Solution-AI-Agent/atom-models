import { render, screen } from '@testing-library/react'
import { GpuTable } from '@/components/infra/gpu-table'

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

const mockGpus = [
  { name: 'A100 80GB', slug: 'a100-80gb', vendor: 'NVIDIA', vram: 80, memoryType: 'HBM2e', fp16Tflops: 312, int8Tops: 624, tdp: 300, msrp: 10000, cloudHourly: 1.10, category: 'datacenter' as const, notes: '' },
  { name: 'RTX 4090', slug: 'rtx-4090', vendor: 'NVIDIA', vram: 24, memoryType: 'GDDR6X', fp16Tflops: 165, int8Tops: 660, tdp: 450, msrp: 1599, cloudHourly: 0.40, category: 'consumer' as const, notes: '' },
]

describe('GpuTable', () => {
  it('should render GPU names', () => {
    render(<GpuTable gpus={mockGpus} />)
    expect(screen.getByText('A100 80GB')).toBeInTheDocument()
    expect(screen.getByText('RTX 4090')).toBeInTheDocument()
  })

  it('should render VRAM values', () => {
    render(<GpuTable gpus={mockGpus} />)
    expect(screen.getByText('80 GB')).toBeInTheDocument()
    expect(screen.getByText('24 GB')).toBeInTheDocument()
  })

  it('should render cloud hourly prices', () => {
    render(<GpuTable gpus={mockGpus} />)
    expect(screen.getByText('$1.10/h')).toBeInTheDocument()
    expect(screen.getByText('$0.40/h')).toBeInTheDocument()
  })

  it('should show category tabs', () => {
    render(<GpuTable gpus={mockGpus} />)
    expect(screen.getByText('전체')).toBeInTheDocument()
  })
})
