'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BvaProfileSummary } from './bva-profile-summary'
import { BvaDimensionComparison } from './bva-dimension-comparison'
import { BvaCostSimulation } from './bva-cost-simulation'
import { BvaComplianceChecklist } from './bva-compliance-checklist'
import type { IBvaReport, IBvaCustomerProfile, BvaSupportedLanguage, BvaVolumeTier, BvaTone } from '@/lib/types/bva'

const VOLUME_LABELS: Record<string, string> = {
  'under-10k': '1만 이하',
  '10k-100k': '1~10만',
  '100k-1m': '10~100만',
  'over-1m': '100만+',
}

function parseProfileFromParams(params: URLSearchParams): IBvaCustomerProfile {
  return {
    industry: params.get('industry') ?? '',
    taskTypes: (params.get('taskTypes') ?? '').split(',').filter(Boolean),
    monthlyVolume: (params.get('monthlyVolume') ?? 'under-10k') as BvaVolumeTier,
    languages: (params.get('languages') ?? 'ko').split(',').filter(Boolean) as BvaSupportedLanguage[],
    tone: (params.get('tone') ?? 'formal') as BvaTone,
    security: {
      onPremiseRequired: params.get('onPremiseRequired') === 'true',
      personalDataHandling: params.get('personalDataHandling') === 'true',
      regulatedIndustry: params.get('regulatedIndustry') === 'true',
    },
  }
}

interface BvaReportProps {
  readonly categoryName: string
}

export function BvaReport({ categoryName }: BvaReportProps) {
  const searchParams = useSearchParams()
  const [report, setReport] = useState<IBvaReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReport() {
      const profile = parseProfileFromParams(searchParams)

      try {
        const response = await fetch('/api/bva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        })

        if (!response.ok) {
          throw new Error('Failed to generate report')
        }

        const data = await response.json() as IBvaReport
        setReport(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [searchParams])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">BVA 분석 리포트를 생성하고 있습니다...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-destructive">{error ?? 'Failed to load report'}</p>
          <Link href="/bva">
            <Button variant="outline" className="mt-4">다시 시도</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const allModels = [...report.commercial, ...report.openSource]
  const volumeLabel = VOLUME_LABELS[report.profile.monthlyVolume] ?? report.profile.monthlyVolume
  const topModel = report.commercial[0] ?? report.openSource[0]

  return (
    <div className="space-y-6">
      <BvaProfileSummary profile={report.profile} categoryName={categoryName} />

      {report.commercial.length > 0 && (
        <BvaDimensionComparison
          models={report.commercial}
          title="상용 모델 추천 (Top 3)"
        />
      )}

      {report.openSource.length > 0 && (
        <BvaDimensionComparison
          models={report.openSource}
          title="오픈소스 모델 추천 (Top 3)"
        />
      )}

      <BvaCostSimulation models={allModels} volumeLabel={volumeLabel} />

      <BvaComplianceChecklist models={allModels} />

      {topModel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">추천 사유</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {categoryName} 분야의 업무 특성과 입력하신 요구사항을 종합 분석한 결과,{' '}
              <span className="font-semibold">{topModel.name}</span>
              <Badge variant="outline" className="mx-1 text-xs">{topModel.provider}</Badge>
              모델을 1순위로 추천합니다.
              종합 점수 <span className="font-semibold">{topModel.totalScore}점</span>으로
              각 평가 차원에서 균형 잡힌 성능을 보여주며,
              {report.profile.languages.includes('ko') && ' 한국어 처리 능력이 우수하고,'}
              {report.profile.security.onPremiseRequired && ' 온프레미스 배포 요구사항을 고려하였습니다.'}
              {!report.profile.security.onPremiseRequired && ' 비용 대비 성능이 뛰어납니다.'}
            </p>
            <div className="mt-4">
              <Link href="/methodology">
                <Button variant="link" className="px-0 text-sm">
                  평가 방법론 상세보기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
