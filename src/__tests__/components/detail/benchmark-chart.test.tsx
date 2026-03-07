import { render, screen } from '@testing-library/react'
import { BenchmarkChart } from '@/components/detail/benchmark-chart'

// Mock Recharts to avoid canvas/SVG issues in jest
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Cell: () => <div data-testid="cell" />,
}))

describe('BenchmarkChart', () => {
  const benchmarks = { mmlu: 87.5, gpqa: 72.3, swe_bench: 49.0, aime: 16.0 }

  it('should render chart container', () => {
    render(<BenchmarkChart benchmarks={benchmarks} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('should render empty state when no benchmarks', () => {
    render(<BenchmarkChart benchmarks={{}} />)
    expect(screen.getByText(/벤치마크 데이터가 없습니다/)).toBeInTheDocument()
  })
})
