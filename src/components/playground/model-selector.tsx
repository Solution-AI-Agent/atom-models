'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { IModel } from '@/lib/types/model'

const MAX_MODELS = 3

interface ModelSelectorProps {
  readonly selectedModels: readonly IModel[]
  readonly onModelsChange: (models: readonly IModel[]) => void
}

export function ModelSelector({ selectedModels, onModelsChange }: ModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<readonly IModel[]>([])
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    async function fetchModels() {
      const res = await fetch('/api/models?limit=200')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        const withOpenRouter = json.data.filter(
          (m: IModel) => m.openRouterModelId,
        )
        setAvailableModels(withOpenRouter)
      }
    }
    fetchModels()
  }, [])

  const filtered = availableModels.filter(
    (m) =>
      !selectedModels.some((s) => s._id === m._id) &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.provider.toLowerCase().includes(search.toLowerCase())),
  )

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

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">모델 선택 (최대 {MAX_MODELS}개)</label>

      <div className="flex flex-wrap gap-2">
        {selectedModels.map((model) => (
          <Badge key={model._id} variant="secondary" className="gap-1 py-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: model.colorCode }}
            />
            {model.provider} / {model.name}
            <button onClick={() => handleRemove(model._id!)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {selectedModels.length < MAX_MODELS && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropdown(!showDropdown)}
            >
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
                <div className="max-h-48 overflow-y-auto">
                  {filtered.slice(0, 20).map((model) => (
                    <button
                      key={model._id}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => handleAdd(model)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: model.colorCode }}
                      />
                      <span className="text-muted-foreground">{model.provider}</span>
                      <span>{model.name}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      결과 없음
                    </p>
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
