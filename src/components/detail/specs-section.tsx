import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatContextWindow } from '@/lib/utils/format'
import type { ModelArchitecture } from '@/lib/types/model'

interface SpecsSectionProps {
  readonly architecture: ModelArchitecture
  readonly parameterSize: number | null
  readonly activeParameters: number | null
  readonly contextWindow: number
  readonly maxOutput: number
  readonly license: string
}

function formatArchitecture(arch: ModelArchitecture): string {
  return arch === 'moe' ? 'MoE (Mixture of Experts)' : 'Dense'
}

function formatParams(size: number | null): string {
  if (size === null) return '-'
  return `${size}B`
}

export function SpecsSection({
  architecture,
  parameterSize,
  activeParameters,
  contextWindow,
  maxOutput,
  license,
}: SpecsSectionProps) {
  const specs = [
    { label: '아키텍처', value: formatArchitecture(architecture) },
    { label: '총 파라미터', value: formatParams(parameterSize) },
    { label: '활성 파라미터', value: formatParams(activeParameters) },
    { label: '컨텍스트 윈도우', value: formatContextWindow(contextWindow) },
    { label: '최대 출력', value: formatContextWindow(maxOutput) },
    { label: '라이선스', value: license },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>모델 사양</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <div key={spec.label} className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{spec.label}</span>
              <span className="font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
