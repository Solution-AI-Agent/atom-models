import { HighlightWinner } from './highlight-winner'
import { PriceDiff } from './price-diff'
import { formatPrice, formatNumber } from '@/lib/utils/format'
import type { IModel } from '@/lib/types/model'

interface CompareRowProps {
  readonly label: string
  readonly models: readonly IModel[]
  readonly getValue: (model: IModel) => number | string | null
  readonly format?: (value: number | string | null) => string
  readonly highlightMode?: 'highest' | 'lowest' | 'none'
  readonly showPriceDiff?: boolean
}

function defaultFormat(value: number | string | null): string {
  if (value === null) return '-'
  if (typeof value === 'string') return value
  return String(value)
}

export function CompareRow({
  label,
  models,
  getValue,
  format = defaultFormat,
  highlightMode = 'none',
  showPriceDiff = false,
}: CompareRowProps) {
  const values = models.map(getValue)
  const numericValues = values.map((v) => (typeof v === 'number' ? v : 0))

  return (
    <tr className="border-b">
      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-muted-foreground">
        {label}
      </td>
      {models.map((model, i) => (
        <td key={model.slug} className="px-4 py-3 text-center text-sm">
          {highlightMode !== 'none' ? (
            <HighlightWinner values={numericValues} index={i} mode={highlightMode}>
              {format(values[i])}
            </HighlightWinner>
          ) : (
            format(values[i])
          )}
        </td>
      ))}
      {showPriceDiff && models.length >= 2 && (
        <td className="px-4 py-3 text-center">
          <PriceDiff prices={numericValues} />
        </td>
      )}
    </tr>
  )
}

interface CompareRowGroupProps {
  readonly title: string
  readonly models: readonly IModel[]
}

export function CompareSpecsRows({ models }: { readonly models: readonly IModel[] }) {
  return (
    <>
      <CompareRow label="타입" models={models} getValue={(m) => m.type === 'commercial' ? 'Commercial' : 'Open Source'} />
      <CompareRow label="티어" models={models} getValue={(m) => m.tier} />
      <CompareRow label="파라미터" models={models} getValue={(m) => m.parameterSize} format={(v) => v === null ? '-' : `${v}B`} />
      <CompareRow label="컨텍스트" models={models} getValue={(m) => m.contextWindow} format={(v) => typeof v === 'number' ? formatNumber(v) : '-'} highlightMode="highest" />
      <CompareRow label="최대 출력" models={models} getValue={(m) => m.maxOutput} format={(v) => typeof v === 'number' ? formatNumber(v) : '-'} highlightMode="highest" />
      <CompareRow label="아키텍처" models={models} getValue={(m) => m.architecture} />
      <CompareRow label="라이선스" models={models} getValue={(m) => m.license} />
    </>
  )
}

export function ComparePricingRows({ models }: { readonly models: readonly IModel[] }) {
  return (
    <>
      <CompareRow label="입력 가격 ($/1M)" models={models} getValue={(m) => m.pricing.input} format={(v) => typeof v === 'number' ? formatPrice(v) : '-'} highlightMode="lowest" showPriceDiff />
      <CompareRow label="출력 가격 ($/1M)" models={models} getValue={(m) => m.pricing.output} format={(v) => typeof v === 'number' ? formatPrice(v) : '-'} highlightMode="lowest" showPriceDiff />
    </>
  )
}

export function CompareScoresRows({ models }: { readonly models: readonly IModel[] }) {
  return (
    <>
      <CompareRow label="SOC2" models={models} getValue={(m) => m.compliance.soc2 ? 'Yes' : 'No'} />
      <CompareRow label="HIPAA" models={models} getValue={(m) => m.compliance.hipaa ? 'Yes' : 'No'} />
      <CompareRow label="GDPR" models={models} getValue={(m) => m.compliance.gdpr ? 'Yes' : 'No'} />
      <CompareRow label="On-Premise" models={models} getValue={(m) => m.compliance.onPremise ? 'Yes' : 'No'} />
      <CompareRow label="Data Exclusion" models={models} getValue={(m) => m.compliance.dataExclusion ? 'Yes' : 'No'} />
    </>
  )
}

export function CompareBenchmarkRows({ models }: { readonly models: readonly IModel[] }) {
  const allKeys = new Set(models.flatMap((m) => Object.keys(m.benchmarks || {})))

  return (
    <>
      {Array.from(allKeys).map((key) => (
        <CompareRow
          key={key}
          label={key.toUpperCase()}
          models={models}
          getValue={(m) => (m.benchmarks as Record<string, number | null>)?.[key] ?? null}
          format={(v) => v === null ? '-' : String(v)}
          highlightMode="highest"
        />
      ))}
    </>
  )
}

export function CompareInfraRows({ models }: { readonly models: readonly IModel[] }) {
  return (
    <>
      <CompareRow label="최소 GPU" models={models} getValue={(m) => m.infrastructure?.minGpu ?? null} />
      <CompareRow label="VRAM (FP16)" models={models} getValue={(m) => m.infrastructure?.vramFp16 ?? null} format={(v) => v === null ? '-' : `${v} GB`} />
      <CompareRow label="VRAM (INT8)" models={models} getValue={(m) => m.infrastructure?.vramInt8 ?? null} format={(v) => v === null ? '-' : `${v} GB`} />
      <CompareRow label="VRAM (INT4)" models={models} getValue={(m) => m.infrastructure?.vramInt4 ?? null} format={(v) => v === null ? '-' : `${v} GB`} />
      <CompareRow label="예상 TPS" models={models} getValue={(m) => m.infrastructure?.estimatedTps ?? null} highlightMode="highest" />
    </>
  )
}
