'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Check } from 'lucide-react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-1 h-4 w-4" />
          복사됨
        </>
      ) : (
        <>
          <Share2 className="mr-1 h-4 w-4" />
          URL 공유
        </>
      )}
    </Button>
  )
}
