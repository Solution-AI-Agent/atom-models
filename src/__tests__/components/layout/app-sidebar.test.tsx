import { render, screen } from '@testing-library/react'
import { AppSidebar } from '@/components/layout/app-sidebar'

jest.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: any) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: any) => <div>{children}</div>,
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: any) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: any) => <div>{children}</div>,
  SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
  SidebarMenuButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SidebarMenuBadge: ({ children }: any) => <span data-testid="menu-badge">{children}</span>,
  SidebarHeader: ({ children }: any) => <div>{children}</div>,
  SidebarFooter: ({ children }: any) => <div>{children}</div>,
  SidebarProvider: ({ children }: any) => <div>{children}</div>,
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Menu</button>,
  SidebarInset: ({ children }: any) => <div>{children}</div>,
  SidebarRail: () => <div data-testid="sidebar-rail" />,
}))

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: jest.fn(), clearAll: jest.fn() }),
}))

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>
})

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('AppSidebar', () => {
  it('should render navigation links', () => {
    render(<AppSidebar />)
    expect(screen.getByText('모델 탐색')).toBeInTheDocument()
    expect(screen.getByText('비교')).toBeInTheDocument()
    expect(screen.getByText('산업별 추천')).toBeInTheDocument()
    expect(screen.getByText('인프라 가이드')).toBeInTheDocument()
  })

  it('should render the app title', () => {
    render(<AppSidebar />)
    expect(screen.getByText('Atom Models')).toBeInTheDocument()
  })
})
