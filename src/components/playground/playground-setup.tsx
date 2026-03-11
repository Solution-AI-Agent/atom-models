'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/playground/model-selector'
import { ParameterPanel } from '@/components/playground/parameter-panel'
import type { IModel } from '@/lib/types/model'
import type { IPlaygroundParameters } from '@/lib/types/playground'

interface PlaygroundSetupProps {
  readonly selectedModels: readonly IModel[]
  readonly onModelsChange: (models: readonly IModel[]) => void
  readonly systemPrompt: string
  readonly onSystemPromptChange: (prompt: string) => void
  readonly defaultParameters: IPlaygroundParameters
  readonly onDefaultParametersChange: (params: IPlaygroundParameters) => void
  readonly collapsed: boolean
  readonly onToggleCollapse: () => void
  readonly disabled: boolean
}

export function PlaygroundSetup({
  selectedModels,
  onModelsChange,
  systemPrompt,
  onSystemPromptChange,
  defaultParameters,
  onDefaultParametersChange,
  collapsed,
  onToggleCollapse,
  disabled,
}: PlaygroundSetupProps) {
  if (collapsed) {
    return (
      <div className="border-b px-4 py-2">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
        >
          <span>
            {selectedModels.map((m) => m.name).join(', ')} | 시스템 프롬프트:{' '}
            {systemPrompt
              ? (systemPrompt.length > 50 ? systemPrompt.slice(0, 50) + '...' : systemPrompt)
              : '없음'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 border-b px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">세션 설정</h2>
        {disabled && (
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <ChevronUp className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ModelSelector
        selectedModels={selectedModels}
        onModelsChange={onModelsChange}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">시스템 프롬프트</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder="모든 모델에 공통으로 적용될 시스템 프롬프트를 입력하세요..."
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px] resize-y"
          disabled={disabled}
        />
      </div>

      <ParameterPanel
        parameters={defaultParameters}
        onChange={onDefaultParametersChange}
        label="기본 파라미터 (공통)"
      />
    </div>
  )
}
