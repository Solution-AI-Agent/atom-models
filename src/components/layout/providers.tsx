'use client'

import type { ReactNode } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { CompareProvider } from '@/contexts/compare-context'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { CompareFloatingBar } from '@/components/layout/compare-floating-bar'
import { Separator } from '@/components/ui/separator'

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SidebarProvider>
      <CompareProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium">Atom Models</span>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
        <CompareFloatingBar />
      </CompareProvider>
    </SidebarProvider>
  )
}
