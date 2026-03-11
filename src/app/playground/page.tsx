'use client'

import { useState } from 'react'
import { PlaygroundHeader } from '@/components/playground/playground-header'

export default function PlaygroundPage() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
      <PlaygroundHeader
        currentSessionId={currentSessionId}
        onNewSession={() => setCurrentSessionId(null)}
        onSelectSession={setCurrentSessionId}
      />
      <div className="flex-1 overflow-hidden p-4">
        <p className="text-muted-foreground">Setup area placeholder</p>
      </div>
    </div>
  )
}
