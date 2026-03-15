'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ISimulatorInputs } from '@/lib/types/simulator'

interface CommonInputsProps {
  readonly inputs: ISimulatorInputs
  readonly onChange: (inputs: ISimulatorInputs) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

const FIELDS: { key: keyof ISimulatorInputs; label: string; suffix: string }[] = [
  { key: 'dailyRequests', label: '일 평균 요청 수', suffix: '건' },
  { key: 'avgInputTokens', label: '평균 Input 토큰', suffix: 'tokens' },
  { key: 'avgOutputTokens', label: '평균 Output 토큰', suffix: 'tokens' },
  { key: 'monthlyDays', label: '월 운영 일수', suffix: '일' },
]

const LIMITS: Record<keyof ISimulatorInputs, [number, number]> = {
  dailyRequests: [1, 1_000_000],
  avgInputTokens: [1, 200_000],
  avgOutputTokens: [1, 200_000],
  monthlyDays: [1, 31],
}

export function CommonInputs({ inputs, onChange }: CommonInputsProps) {
  const handleChange = (field: keyof ISimulatorInputs, raw: string) => {
    const num = parseInt(raw, 10)
    if (isNaN(num)) return

    const [min, max] = LIMITS[field]
    onChange({ ...inputs, [field]: clamp(num, min, max) })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map(({ key, label, suffix }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <div className="relative">
                <Input
                  id={key}
                  type="number"
                  value={inputs[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {suffix}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
