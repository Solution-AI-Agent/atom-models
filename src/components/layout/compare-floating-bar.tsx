'use client'

import Link from 'next/link'
import { XIcon, GitCompareArrowsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompare } from '@/contexts/compare-context'

export function CompareFloatingBar() {
  const { models, clearAll } = useCompare()

  if (models.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-lg">
        <GitCompareArrowsIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {models.length}개 모델 선택됨
        </span>
        <Link
          href={`/compare?models=${models.join(',')}`}
          className="rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          비교하기
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full"
          onClick={clearAll}
        >
          <XIcon className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
