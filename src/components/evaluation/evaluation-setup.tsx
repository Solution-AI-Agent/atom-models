'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FileUploadZone } from './file-upload-zone'
import { DataPreviewTable } from './data-preview-table'
import { EvaluatorSelector } from './evaluator-selector'
import type { IModel } from '@/lib/types/model'
import type {
  EvaluatorName,
  IEvaluationUploadResponse,
  IEvaluationModelConfig,
} from '@/lib/types/evaluation'

const MAX_MODELS = 3

export function EvaluationSetup() {
  const router = useRouter()
  const [sessionName, setSessionName] = useState('')
  const [selectedModels, setSelectedModels] = useState<readonly IModel[]>([])
  const [availableModels, setAvailableModels] = useState<readonly IModel[]>([])
  const [evaluators, setEvaluators] = useState<readonly EvaluatorName[]>(['correctness'])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [uploadResult, setUploadResult] = useState<IEvaluationUploadResponse | null>(null)
  const [uploadFileName, setUploadFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // Model dropdown state
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/models?limit=200')
        if (!res.ok) return
        const json = await res.json()
        if (json.success) {
          const withOpenRouter = json.data.filter(
            (m: IModel) => m.openRouterModelId,
          )
          setAvailableModels(withOpenRouter)
        }
      } catch {
        // Ignore fetch errors
      }
    }
    fetchModels()
  }, [])

  useEffect(() => {
    if (!showModelDropdown) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
        setModelSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showModelDropdown])

  const filteredModels = availableModels
    .filter(
      (m) =>
        !selectedModels.some((s) => s._id === m._id) &&
        (m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.providerId.toLowerCase().includes(modelSearch.toLowerCase())),
    )
    .sort((a, b) => a.providerId.localeCompare(b.providerId) || a.name.localeCompare(b.name))

  const handleAddModel = useCallback(
    (model: IModel) => {
      if (selectedModels.length >= MAX_MODELS) return
      setSelectedModels((prev) => [...prev, model])
      setModelSearch('')
      setShowModelDropdown(false)
    },
    [selectedModels],
  )

  const handleRemoveModel = useCallback((modelId: string) => {
    setSelectedModels((prev) => prev.filter((m) => m._id !== modelId))
  }, [])

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/evaluation/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setUploadError(json.error ?? 'Upload failed')
        return
      }
      setUploadResult(json.data)
      setUploadFileName(file.name)
    } catch {
      setUploadError('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleRun = useCallback(async () => {
    if (!uploadResult || selectedModels.length === 0 || evaluators.length === 0) return
    setIsRunning(true)
    setRunError(null)
    try {
      const models: readonly IEvaluationModelConfig[] = selectedModels.map((m) => ({
        modelId: m._id!,
        slug: m.slug,
        openRouterModelId: m.openRouterModelId!,
        modelName: m.name,
        provider: m.providerId,
        parameters: { temperature: 0.7, maxTokens: 2048 },
      }))

      const res = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName || `Evaluation ${new Date().toLocaleDateString('ko-KR')}`,
          rows: uploadResult.rows,
          fileName: uploadFileName,
          columns: uploadResult.columns,
          models,
          evaluators,
          systemPrompt: systemPrompt || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setRunError(json.error ?? 'Evaluation failed to start')
        return
      }
      router.push(`/evaluation/result/${json.data._id}`)
    } catch {
      setRunError('Evaluation failed to start')
    } finally {
      setIsRunning(false)
    }
  }, [uploadResult, selectedModels, evaluators, sessionName, systemPrompt, uploadFileName, router])

  const canRun = uploadResult && selectedModels.length > 0 && evaluators.length > 0 && !isRunning

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left column: File upload and preview */}
      <div className="space-y-6">
        <FileUploadZone
          onUpload={handleUpload}
          isLoading={isUploading}
          error={uploadError}
        />
        {uploadResult && (
          <DataPreviewTable
            columns={[...uploadResult.columns]}
            preview={[...uploadResult.preview]}
            totalRows={uploadResult.rowCount}
          />
        )}
      </div>

      {/* Right column: Configuration */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="session-name">세션 이름</Label>
          <Input
            id="session-name"
            placeholder="평가 세션 이름을 입력하세요"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />
        </div>

        {/* Model selector */}
        <div className="space-y-3">
          <Label>모델 선택 (최대 {MAX_MODELS}개)</Label>
          <div className="flex flex-wrap gap-2">
            {selectedModels.map((model) => (
              <Badge key={model._id} variant="secondary" className="gap-1 py-1">
                {model.providerId} / {model.name}
                <button onClick={() => handleRemoveModel(model._id!)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedModels.length < MAX_MODELS && (
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  모델 추가
                </Button>
                {showModelDropdown && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover p-2 shadow-md">
                    <input
                      type="text"
                      placeholder="모델명 또는 프로바이더 검색..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="mb-2 w-full rounded-md border px-3 py-1.5 text-sm"
                      autoFocus
                    />
                    <div className="max-h-64 overflow-y-auto">
                      {filteredModels.length === 0 ? (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          결과 없음
                        </p>
                      ) : (
                        (() => {
                          let lastProvider = ''
                          return filteredModels.map((model) => {
                            const showHeader = model.providerId !== lastProvider
                            lastProvider = model.providerId
                            return (
                              <div key={model._id}>
                                {showHeader && (
                                  <p className="mt-1 px-2 py-1 text-xs font-medium text-muted-foreground first:mt-0">
                                    {model.providerId}
                                  </p>
                                )}
                                <button
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                                  onClick={() => handleAddModel(model)}
                                >
                                  <span>{model.name}</span>
                                </button>
                              </div>
                            )
                          })
                        })()
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <EvaluatorSelector selected={evaluators} onChange={setEvaluators} />

        <div className="space-y-2">
          <Label htmlFor="system-prompt">시스템 프롬프트 (선택)</Label>
          <textarea
            id="system-prompt"
            placeholder="모델에 전달할 시스템 프롬프트를 입력하세요"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {runError && (
          <p className="text-sm text-destructive">{runError}</p>
        )}

        <Button
          onClick={handleRun}
          disabled={!canRun}
          className="w-full"
        >
          {isRunning ? '평가 실행 중...' : '평가 실행'}
        </Button>
      </div>
    </div>
  )
}
