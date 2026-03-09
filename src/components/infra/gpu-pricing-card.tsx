import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GpuPricingCardProps {
  readonly msrp: number
  readonly cloudHourly: number
}

export function GpuPricingCard({ msrp, cloudHourly }: GpuPricingCardProps) {
  const monthlyEstimate = cloudHourly * 730
  const yearlyEstimate = monthlyEstimate * 12

  return (
    <Card>
      <CardHeader>
        <CardTitle>가격 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">MSRP</span>
            <span className="text-lg font-semibold">
              ${msrp.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">클라우드 시간당</span>
            <span className="text-lg font-semibold">
              ${cloudHourly.toFixed(2)}/h
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">클라우드 월 추정 (24/7)</span>
            <span className="text-lg font-semibold">
              ${monthlyEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}/월
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">클라우드 연 추정</span>
            <span className="text-lg font-semibold">
              ${yearlyEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}/년
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
