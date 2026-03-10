import { render, screen } from '@testing-library/react'
import { TpsFormulaInfo } from '@/components/infra/tps-formula-info'

describe('TpsFormulaInfo', () => {
  it('renders formula expression with TPS and TFLOPS', () => {
    render(<TpsFormulaInfo />)
    expect(screen.getByText('TPS = baseTPS × (대상 GPU TFLOPS / 기준 GPU TFLOPS)')).toBeInTheDocument()
  })

  it('renders formula description when no formula prop', () => {
    render(<TpsFormulaInfo />)
    expect(screen.getByText(/기준 GPU 대비 TFLOPS 비율로/)).toBeInTheDocument()
  })

  it('displays actual formula values when provided', () => {
    render(
      <TpsFormulaInfo
        formula={{
          baseTps: 35,
          refGpuName: 'NVIDIA RTX 4090',
          refTflops: 165,
          targetTflops: 210,
          ratio: 1.273,
        }}
      />
    )
    expect(screen.getByText(/NVIDIA RTX 4090/)).toBeInTheDocument()
    expect(screen.getByText(/165 TFLOPS/)).toBeInTheDocument()
    expect(screen.getByText(/210 TFLOPS/)).toBeInTheDocument()
    expect(screen.getByText(/35 tokens\/s/)).toBeInTheDocument()
  })

  it('renders without errors when formula is undefined', () => {
    const { container } = render(<TpsFormulaInfo />)
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument()
  })
})
