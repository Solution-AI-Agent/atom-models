export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { getAllRefBenchmarks, getAllBvaDimensions } from '@/lib/services/bva.service'
import type { IRefBenchmark } from '@/lib/types/bva'

export default async function MethodologyPage() {
  const [benchmarks, dimensions] = await Promise.all([
    getAllRefBenchmarks(),
    getAllBvaDimensions(),
  ])

  const benchmarkMap = new Map<string, IRefBenchmark>(
    benchmarks.map((b) => [b._id, b]),
  )

  return (
    <div className="space-y-8 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">BVA 평가 방법론</h1>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Atom Models의 BVA(Business Value Assessment)는 공신력 있는 벤치마크를
          기반으로 LLM 모델을 평가합니다. 자체 점수가 아닌 투명한 벤치마크 데이터를
          사용하여 고객에게 근거 있는 추천을 제공합니다.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">평가 차원</h2>
        <p className="text-sm text-muted-foreground">
          LLM 모델의 비즈니스 가치를 {dimensions.length}개 차원과 비용 효율성으로 평가합니다.
          각 차원은 관련 벤치마크의 가중 평균으로 계산됩니다.
        </p>

        <div className="space-y-4">
          {dimensions.map((dim) => (
            <Card key={dim.key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{dim.displayName}</CardTitle>
                  <Badge variant="outline" className="text-xs">{dim.key}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{dim.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">계산 공식</p>
                  <p className="text-sm">{dim.formulaExplanation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">구성 벤치마크</p>
                  <div className="flex flex-wrap gap-2">
                    {dim.formula.map((entry) => {
                      const meta = benchmarkMap.get(entry.benchmark)
                      return (
                        <Badge key={entry.benchmark} variant="secondary" className="text-xs">
                          {meta?.name ?? entry.benchmark} ({Math.round(entry.weight * 100)}%)
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">비용 효율</CardTitle>
                <Badge variant="outline" className="text-xs">cost</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                모델 사용에 따른 비용 대비 가치를 평가합니다.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                상용 모델: max(0, 100 - (output 가격 / $60) * 100)<br />
                오픈소스 모델: 100 (API 비용 없음)
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">벤치마크 상세</h2>
        <p className="text-sm text-muted-foreground">
          BVA 평가에 사용되는 벤치마크들의 상세 정보입니다.
          모든 벤치마크는 학술 기관 또는 연구소에서 개발한 공개 평가 기준입니다.
        </p>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[80px]">벤치마크</TableHead>
                <TableHead className="min-w-[80px]">카테고리</TableHead>
                <TableHead className="min-w-[120px]">설명</TableHead>
                <TableHead className="min-w-[80px]">출처</TableHead>
                <TableHead className="min-w-[60px]">만점</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map((meta) => (
                <TableRow key={meta._id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{meta.name}</span>
                      <p className="text-xs text-muted-foreground">{meta.displayName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{meta.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{meta.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{meta.source}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{meta.maxScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">계산 방법</h2>
        <div className="space-y-3 text-sm leading-relaxed">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold">1. 차원 점수 계산</h3>
              <p>
                각 차원의 점수는 해당 차원에 속한 벤치마크 점수의 가중 평균으로 계산됩니다.
                모델에 특정 벤치마크 데이터가 없으면 해당 항목을 건너뛰고
                나머지 벤치마크의 가중치를 재정규화하여 계산합니다.
              </p>

              <h3 className="font-semibold">2. 종합 점수 계산</h3>
              <p>
                종합 점수 = (차원 평균 점수 * 70%) + (비용 점수 * 30%)로 산출됩니다.
                null인 차원은 평균 계산에서 제외됩니다.
              </p>

              <h3 className="font-semibold">3. null 벤치마크 처리</h3>
              <p>
                데이터가 없는 벤치마크는 추정치를 넣지 않습니다.
                해당 벤치마크를 제외하고 나머지 가중치를 재정규화하여 공정하게 평가합니다.
                차원의 모든 벤치마크가 null이면 해당 차원 점수도 null이 됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
