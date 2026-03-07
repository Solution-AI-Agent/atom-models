import { render, screen } from '@testing-library/react'
import { StatsOverview } from '@/components/home/stats-overview'
import { HeroSection } from '@/components/home/hero-section'
import { QuickAccessCards } from '@/components/home/quick-access-cards'

describe('StatsOverview', () => {
  it('should display model count', () => {
    render(<StatsOverview modelCount={36} presetCount={5} />)
    expect(screen.getByText('36')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should display labels', () => {
    render(<StatsOverview modelCount={36} presetCount={5} />)
    expect(screen.getByText(/등록 모델/)).toBeInTheDocument()
    expect(screen.getByText(/산업 프리셋/)).toBeInTheDocument()
  })
})

describe('HeroSection', () => {
  it('should render product title', () => {
    render(<HeroSection />)
    expect(screen.getByText(/Atom Models/)).toBeInTheDocument()
  })

  it('should render CTA buttons', () => {
    render(<HeroSection />)
    expect(screen.getByRole('link', { name: /탐색/ })).toBeInTheDocument()
  })
})

describe('QuickAccessCards', () => {
  it('should render feature cards', () => {
    render(<QuickAccessCards />)
    expect(screen.getByText(/모델 탐색/)).toBeInTheDocument()
    expect(screen.getByText(/모델 비교/)).toBeInTheDocument()
  })
})
