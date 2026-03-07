import { render, screen } from '@testing-library/react'
import { SpecsSection } from '@/components/detail/specs-section'

describe('SpecsSection', () => {
  it('should render architecture info', () => {
    render(
      <SpecsSection
        architecture="moe"
        parameterSize={400}
        activeParameters={17}
        contextWindow={1048576}
        maxOutput={16384}
        license="Llama 4 Community"
      />
    )
    expect(screen.getByText(/MoE/)).toBeInTheDocument()
    expect(screen.getByText(/400B/)).toBeInTheDocument()
    expect(screen.getByText(/17B/)).toBeInTheDocument()
  })

  it('should render context window', () => {
    render(
      <SpecsSection
        architecture="dense"
        parameterSize={null}
        activeParameters={null}
        contextWindow={200000}
        maxOutput={8192}
        license="Proprietary"
      />
    )
    expect(screen.getByText(/200K/)).toBeInTheDocument()
  })

  it('should render license info', () => {
    render(
      <SpecsSection
        architecture="dense"
        parameterSize={null}
        activeParameters={null}
        contextWindow={128000}
        maxOutput={4096}
        license="MIT"
      />
    )
    expect(screen.getByText('MIT')).toBeInTheDocument()
  })
})
