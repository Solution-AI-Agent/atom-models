export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionList } from '@/components/evaluation/session-list'
import { getEvaluationSessions } from '@/lib/services/evaluation.service'

export default async function EvaluationHistoryPage() {
  const sessions = await getEvaluationSessions()

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/evaluation">
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            평가
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">평가 히스토리</h1>
        <p className="mt-1 text-muted-foreground">
          이전 평가 세션 결과를 확인합니다.
        </p>
      </div>

      <SessionList sessions={sessions} />
    </div>
  )
}
