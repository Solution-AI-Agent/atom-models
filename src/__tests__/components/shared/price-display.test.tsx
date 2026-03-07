import { render, screen } from '@testing-library/react'
import { PriceDisplay } from '@/components/shared/price-display'

describe('PriceDisplay', () => {
  it('should render input and output prices', () => {
    render(<PriceDisplay input={3.0} output={15.0} />)
    expect(screen.getByText(/\$3\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument()
  })

  it('should show "Free" for zero prices', () => {
    render(<PriceDisplay input={0} output={0} />)
    const freeElements = screen.getAllByText('Free')
    expect(freeElements.length).toBeGreaterThanOrEqual(1)
  })
})
