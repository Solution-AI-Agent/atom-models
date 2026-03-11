'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { IPlaygroundParameters } from '@/lib/types/playground'

interface ParameterPanelProps {
  readonly parameters: IPlaygroundParameters
  readonly onChange: (params: IPlaygroundParameters) => void
  readonly label?: string
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function ParameterPanel({ parameters, onChange, label }: ParameterPanelProps) {
  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Temperature</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={parameters.temperature}
            onChange={(e) =>
              onChange({ ...parameters, temperature: clamp(parseFloat(e.target.value) || 0, 0, 2) })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Max Tokens</Label>
          <Input
            type="number"
            min={1}
            max={128000}
            step={256}
            value={parameters.maxTokens}
            onChange={(e) =>
              onChange({ ...parameters, maxTokens: clamp(parseInt(e.target.value) || 4096, 1, 128000) })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Top P</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={parameters.topP}
            onChange={(e) =>
              onChange({ ...parameters, topP: clamp(parseFloat(e.target.value) || 1, 0, 1) })
            }
          />
        </div>
      </div>
    </div>
  )
}
