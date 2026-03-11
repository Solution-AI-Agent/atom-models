'use client'

import { useState, useCallback } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  readonly onSend: (message: string) => void
  readonly disabled: boolean
  readonly placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }, [input, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div className="border-t px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '메시지를 입력하세요... (Shift+Enter로 줄바꿈)'}
          className="flex-1 resize-none rounded-md border px-3 py-2 text-sm min-h-[40px] max-h-[120px]"
          rows={1}
          disabled={disabled}
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          size="sm"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
