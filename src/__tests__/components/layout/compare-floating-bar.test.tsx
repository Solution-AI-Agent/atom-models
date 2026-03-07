import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompareFloatingBar } from '@/components/layout/compare-floating-bar'

const mockClearAll = jest.fn()

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({
    models: ['model-a', 'model-b'],
    addModel: jest.fn(),
    removeModel: jest.fn(),
    isComparing: jest.fn(),
    clearAll: mockClearAll,
  }),
}))

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>
})

describe('CompareFloatingBar', () => {
  beforeEach(() => {
    mockClearAll.mockClear()
  })

  it('should render when models are selected', () => {
    render(<CompareFloatingBar />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('should have a link to compare page', () => {
    render(<CompareFloatingBar />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/compare?models=model-a,model-b')
  })

  it('should have a clear button', async () => {
    const user = userEvent.setup()
    render(<CompareFloatingBar />)
    const clearButton = screen.getByRole('button')
    await user.click(clearButton)
    expect(mockClearAll).toHaveBeenCalledTimes(1)
  })
})
