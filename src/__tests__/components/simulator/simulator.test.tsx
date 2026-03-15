import { render, screen } from '@testing-library/react'
import { SimulatorClient } from '@/components/simulator/simulator-client'

// Mock fetch for model/GPU data
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
) as jest.Mock

describe('SimulatorClient', () => {
  it('shows guidance message when no models selected', () => {
    render(<SimulatorClient />)
    expect(screen.getByText(/모델을 선택하면/)).toBeInTheDocument()
  })

  it('renders model selector', () => {
    render(<SimulatorClient />)
    expect(screen.getByText(/모델 선택/)).toBeInTheDocument()
  })

  it('renders common inputs form', () => {
    render(<SimulatorClient />)
    expect(screen.getByText(/일 평균 요청 수/)).toBeInTheDocument()
  })

  it('does not render tabs when no models selected', () => {
    render(<SimulatorClient />)
    expect(screen.queryByText('API 비용')).not.toBeInTheDocument()
  })
})
