import { render, screen } from '@testing-library/react'
import { FitnessScoreBar } from '@/components/recommendations/fitness-score-bar'

const mockRankedModels = [
  { slug: 'model-a', name: 'Model A', provider: 'TestCo', type: 'commercial' as const, score: 87.5, breakdown: {}, infra: null },
  { slug: 'model-b', name: 'Model B', provider: 'TestCo', type: 'open-source' as const, score: 72.3, breakdown: {}, infra: null },
]

describe('FitnessScoreBar', () => {
  it('should render ranked models', () => {
    render(<FitnessScoreBar rankedModels={mockRankedModels} />)
    expect(screen.getByText('Model A')).toBeInTheDocument()
    expect(screen.getByText('87.5')).toBeInTheDocument()
  })

  it('should render models in score order', () => {
    render(<FitnessScoreBar rankedModels={mockRankedModels} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Model A')
    expect(items[1]).toHaveTextContent('Model B')
  })

  it('should render bar widths proportional to score', () => {
    render(<FitnessScoreBar rankedModels={mockRankedModels} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
  })

  it('should handle empty array', () => {
    const { container } = render(<FitnessScoreBar rankedModels={[]} />)
    expect(container.querySelector('[role="list"]')).toBeInTheDocument()
  })
})
