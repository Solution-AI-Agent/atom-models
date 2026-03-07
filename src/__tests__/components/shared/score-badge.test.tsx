import { render, screen } from '@testing-library/react'
import { ScoreBadge } from '@/components/shared/score-badge'

describe('ScoreBadge', () => {
  it('should render score value', () => {
    render(<ScoreBadge label="Quality" value={90} />)
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('Quality')).toBeInTheDocument()
  })

  it('should apply green color for high scores (80+)', () => {
    const { container } = render(<ScoreBadge label="Quality" value={90} />)
    expect(container.firstChild).toHaveClass('text-green-700')
  })

  it('should apply yellow color for medium scores (60-79)', () => {
    const { container } = render(<ScoreBadge label="Speed" value={65} />)
    expect(container.firstChild).toHaveClass('text-yellow-700')
  })

  it('should apply red color for low scores (<60)', () => {
    const { container } = render(<ScoreBadge label="Coding" value={40} />)
    expect(container.firstChild).toHaveClass('text-red-700')
  })
})
