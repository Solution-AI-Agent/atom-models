'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { IModel } from '@/lib/types/model'

const MAX_MODELS = 4

interface SimulatorModelSelectorProps {
  readonly selectedModels: readonly IModel[]
  readonly onModelsChange: (models: readonly IModel[]) => void
}

export function SimulatorModelSelector({ selectedModels, onModelsChange }: SimulatorModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<readonly IModel[]>([])
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDropdown) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  useEffect(() => {
    async function fetchModels() {
      const res = await fetch('/api/models?limit=200')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        setAvailableModels(json.data)
      }
    }
    fetchModels()
  }, [])

  const filtered = availableModels
    .filter(
      (m) =>
        !selectedModels.some((s) => s._id === m._id) &&
        (m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.providerId.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => a.providerId.localeCompare(b.providerId) || a.name.localeCompare(b.name))

  const handleAdd = useCallback(
    (model: IModel) => {
      if (selectedModels.length >= MAX_MODELS) return
      onModelsChange([...selectedModels, model])
      setSearch('')
      setShowDropdown(false)
    },
    [selectedModels, onModelsChange],
  )

  const handleRemove = useCallback(
    (modelId: string) => {
      onModelsChange(selectedModels.filter((m) => m._id !== modelId))
    },
    [selectedModels, onModelsChange],
  )

  // Group filtered models by provider for display
  const grouped = filtered.reduce<Record<string, IModel[]>>((acc, model) => {
    const key = model.providerId
    return { ...acc, [key]: [...(acc[key] ?? []), model] }
  }, {})

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">모델 선택 (최대 {MAX_MODELS}개)</label>
      <div className="flex flex-wrap gap-2">
        {selectedModels.map((model) => (
          <Badge key={model._id} variant="secondary" className="gap-1 py-1">
            {model.providerId} / {model.name}
            <button onClick={() => handleRemove(model._id!)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selectedModels.length < MAX_MODELS && (
          <div className="relative" ref={containerRef}>
            <Button variant="outline" size="sm" onClick={() => setShowDropdown(!showDropdown)}>
              <Plus className="mr-1 h-4 w-4" />
              모델 추가
            </Button>
            {showDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover p-2 shadow-md">
                <input
                  type="text"
                  placeholder="모델명 또는 프로바이더 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-2 w-full rounded-md border px-3 py-1.5 text-sm"
                  autoFocus
                />
                <div className="max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">결과 없음</p>
                  ) : (
                    Object.entries(grouped).map(([providerId, models]) => (
                      <div key={providerId}>
                        <p className="mt-1 px-2 py-1 text-xs font-medium text-muted-foreground first:mt-0">
                          {providerId}
                        </p>
                        {models.map((model) => (
                          <button
                            key={model._id}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                            onClick={() => handleAdd(model)}
                          >
                            <Badge variant="outline" className="text-xs">
                              {model.type === 'commercial' ? 'API' : 'OSS'}
                            </Badge>
                            <span>{model.name}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
