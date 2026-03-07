'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutListIcon, LayoutGridIcon } from 'lucide-react'

export type ViewMode = 'table' | 'card'

export function ViewToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') as ViewMode) || 'table'

  const setView = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', mode)
    router.push(`/explore?${params.toString()}`)
  }

  return (
    <div className="flex gap-1 rounded-lg border p-1">
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setView('table')}
        aria-label="테이블 뷰"
      >
        <LayoutListIcon className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'card' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setView('card')}
        aria-label="카드 뷰"
      >
        <LayoutGridIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
