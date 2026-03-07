import { render, screen } from '@testing-library/react'
import { PriceDiff } from '@/components/compare/price-diff'

describe('PriceDiff', () => {
  it('should show absolute difference', () => {
    render(<PriceDiff prices={[15.0, 3.0]} />)
    expect(screen.getByText(/\$12\.00/)).toBeInTheDocument()
  })

  it('should show multiplier', () => {
    render(<PriceDiff prices={[15.0, 3.0]} />)
    expect(screen.getByText(/5\.0x/)).toBeInTheDocument()
  })

  it('should handle identical prices', () => {
    render(<PriceDiff prices={[10.0, 10.0]} />)
    expect(screen.getByText(/\$0\.00/)).toBeInTheDocument()
    expect(screen.getByText(/1\.0x/)).toBeInTheDocument()
  })

  it('should handle single price', () => {
    render(<PriceDiff prices={[5.0]} />)
    expect(screen.queryByText(/x$/)).not.toBeInTheDocument()
  })
})
