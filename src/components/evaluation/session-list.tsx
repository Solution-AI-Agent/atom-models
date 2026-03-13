'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SessionStatusBadge } from './session-status-badge'
import type { IEvaluationSessionSummary } from '@/lib/types/evaluation'

interface SessionListProps {
  readonly sessions: readonly IEvaluationSessionSummary[]
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium">평가 세션이 없습니다</p>
        <p className="mt-1 text-xs text-muted-foreground">
          새 평가를 시작하면 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <Link key={session._id} href={`/evaluation/result/${session._id}`}>
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="truncate">{session.name}</CardTitle>
                <SessionStatusBadge status={session.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>데이터셋: {session.dataset.fileName} ({session.dataset.rowCount}행)</p>
                <p>모델: {session.modelCount}개</p>
                <p>{new Date(session.createdAt).toLocaleDateString('ko-KR')}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
