'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { IPlaygroundSessionSummary } from '@/lib/types/playground'

interface PlaygroundHeaderProps {
  readonly currentSessionId: string | null
  readonly onNewSession: () => void
  readonly onSelectSession: (id: string) => void
}

export function PlaygroundHeader({
  currentSessionId,
  onNewSession,
  onSelectSession,
}: PlaygroundHeaderProps) {
  const [sessions, setSessions] = useState<readonly IPlaygroundSessionSummary[]>([])
  const [open, setOpen] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/playground/sessions')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) setSessions(json.data)
    } catch {
      // silently ignore network errors
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleSelect = useCallback((id: string) => {
    onSelectSession(id)
    setOpen(false)
  }, [onSelectSession])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/playground/sessions/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setSessions((prev) => prev.filter((s) => s._id !== id))
      if (currentSessionId === id) onNewSession()
    } catch {
      // silently ignore network errors
    }
  }, [currentSessionId, onNewSession])

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="text-lg font-semibold">플레이그라운드</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onNewSession}>
          <Plus className="mr-1 h-4 w-4" />
          새 세션
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="sm" />}>
            <History className="mr-1 h-4 w-4" />
            세션 기록
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>세션 기록</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">저장된 세션이 없습니다.</p>
              )}
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="flex items-start justify-between rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleSelect(session._id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.models.map((m) => m.modelName).join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.messageCount}개 메시지 | {new Date(session.createdAt).toLocaleDateString('ko')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(session._id)
                    }}
                    className="text-destructive"
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
