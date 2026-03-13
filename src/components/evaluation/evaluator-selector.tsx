'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { EvaluatorName } from '@/lib/types/evaluation'

const EVALUATOR_OPTIONS: readonly {
  readonly name: EvaluatorName
  readonly label: string
  readonly description: string
}[] = [
  {
    name: 'correctness',
    label: 'Correctness',
    description: '정답(Ground Truth) 대비 모델 응답의 정확도를 평가합니다.',
  },
  {
    name: 'relevance',
    label: 'Relevance',
    description: '질문에 대한 모델 응답의 관련성과 적절성을 평가합니다.',
  },
  {
    name: 'hallucination',
    label: 'Hallucination',
    description: '모델 응답에 사실과 다른 내용(환각)이 포함되어 있는지 검출합니다.',
  },
]

interface EvaluatorSelectorProps {
  readonly selected: readonly EvaluatorName[]
  readonly onChange: (evaluators: readonly EvaluatorName[]) => void
}

export function EvaluatorSelector({ selected, onChange }: EvaluatorSelectorProps) {
  function handleToggle(name: EvaluatorName, checked: boolean) {
    if (checked) {
      onChange([...selected, name])
    } else {
      onChange(selected.filter((e) => e !== name))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">평가 항목</p>
      <div className="space-y-3">
        {EVALUATOR_OPTIONS.map((option) => (
          <div key={option.name} className="flex items-start gap-3">
            <Checkbox
              checked={selected.includes(option.name)}
              onCheckedChange={(checked) => handleToggle(option.name, checked === true)}
              id={`evaluator-${option.name}`}
            />
            <div className="space-y-0.5">
              <Label htmlFor={`evaluator-${option.name}`} className="cursor-pointer">
                {option.label}
              </Label>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
