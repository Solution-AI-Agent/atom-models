'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'

const ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
const ACCEPTED_EXTENSIONS = '.csv,.xlsx,.xls'

interface FileUploadZoneProps {
  readonly onUpload: (file: File) => void
  readonly isLoading: boolean
  readonly error?: string | null
}

export function FileUploadZone({ onUpload, isLoading, error }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      const isValidType = ACCEPTED_TYPES.includes(file.type)
      const isValidExtension = ['csv', 'xlsx', 'xls'].includes(extension ?? '')
      if (!isValidType && !isValidExtension) return
      onUpload(file)
    },
    [onUpload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isLoading ? '파일 처리 중...' : '파일을 드래그하거나 클릭하여 업로드'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          CSV, XLSX, XLS 파일 지원
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
