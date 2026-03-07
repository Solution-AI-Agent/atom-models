import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/utils/format'
import type { IModelPricing } from '@/lib/types/model'

interface PricingSectionProps {
  readonly pricing: IModelPricing
}

const MONTHLY_EXAMPLES = [
  { label: '소규모 (100K 토큰/일)', dailyTokens: 100_000 },
  { label: '중규모 (1M 토큰/일)', dailyTokens: 1_000_000 },
  { label: '대규모 (10M 토큰/일)', dailyTokens: 10_000_000 },
] as const

function calculateMonthlyCost(pricing: IModelPricing, dailyTokens: number): number {
  const dailyInput = (dailyTokens / 1_000_000) * pricing.input
  const dailyOutput = (dailyTokens / 2 / 1_000_000) * pricing.output
  return (dailyInput + dailyOutput) * 30
}

export function PricingSection({ pricing }: PricingSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>가격 정보</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">입력 (1M 토큰)</span>
            <span className="text-lg font-semibold">{formatPrice(pricing.input)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">출력 (1M 토큰)</span>
            <span className="text-lg font-semibold">{formatPrice(pricing.output)}</span>
          </div>
          {pricing.cachingDiscount > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">캐싱 할인</span>
              <span className="text-lg font-semibold">{Math.round(pricing.cachingDiscount * 100)}%</span>
            </div>
          )}
          {pricing.batchDiscount > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">배치 할인</span>
              <span className="text-lg font-semibold">{Math.round(pricing.batchDiscount * 100)}%</span>
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">월간 비용 예시</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사용량</TableHead>
                <TableHead className="text-right">예상 월비용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHLY_EXAMPLES.map((example) => (
                <TableRow key={example.label}>
                  <TableCell>{example.label}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(calculateMonthlyCost(pricing, example.dailyTokens))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
