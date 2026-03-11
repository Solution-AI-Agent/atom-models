import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { IBvaRankedModel } from '@/lib/types/bva'

interface BvaCostSimulationProps {
  readonly models: readonly IBvaRankedModel[]
  readonly volumeLabel: string
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`
  }
  return `$${amount.toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B`
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(0)}M`
  }
  return `${(tokens / 1_000).toFixed(0)}K`
}

export function BvaCostSimulation({ models, volumeLabel }: BvaCostSimulationProps) {
  const commercialModels = models.filter((m) => m.type === 'commercial' && m.costEstimate)
  const ossModels = models.filter((m) => m.type === 'open-source')

  if (commercialModels.length === 0 && ossModels.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">비용 시뮬레이션</CardTitle>
        <p className="text-sm text-muted-foreground">
          월간 볼륨 {volumeLabel} 기준 예상 비용
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>모델</TableHead>
                <TableHead className="text-center">유형</TableHead>
                <TableHead className="text-right">월간 토큰</TableHead>
                <TableHead className="text-right">예상 월비용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commercialModels.map((model) => (
                <TableRow key={model.slug}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{model.name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{model.provider}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">상용</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {model.costEstimate ? formatTokens(model.costEstimate.monthlyTokens) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {model.costEstimate ? formatCurrency(model.costEstimate.monthlyCost) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {ossModels.map((model) => (
                <TableRow key={model.slug}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{model.name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{model.provider}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">OSS</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    GPU 인프라 비용 별도
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
