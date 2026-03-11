'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  SearchIcon,
  GitCompareArrowsIcon,
  SparklesIcon,
  ServerIcon,
  BarChart3Icon,
  FlaskConicalIcon,
  BookOpenIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useCompare } from '@/contexts/compare-context'

const navItems = [
  { title: '홈', href: '/', icon: HomeIcon },
  { title: '모델 탐색', href: '/explore', icon: SearchIcon },
  { title: '비교', href: '/compare', icon: GitCompareArrowsIcon },
  { title: '산업별 추천', href: '/recommendations', icon: SparklesIcon },
  { title: '인프라 가이드', href: '/infra', icon: ServerIcon },
  { title: 'BVA 분석', href: '/bva', icon: BarChart3Icon },
  { title: '플레이그라운드', href: '/playground', icon: FlaskConicalIcon },
  { title: '평가 방법론', href: '/methodology', icon: BookOpenIcon },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const { models } = useCompare()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            A
          </div>
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Atom Models
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.href === '/compare' && models.length > 0 && (
                      <SidebarMenuBadge>{models.length}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
