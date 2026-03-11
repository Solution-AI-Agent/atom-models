import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { IBvaCustomerProfile } from '@/lib/types/bva'

interface BvaProfileSummaryProps {
  readonly profile: IBvaCustomerProfile
  readonly categoryName: string
}

const VOLUME_LABELS: Record<string, string> = {
  'under-10k': '1만 이하',
  '10k-100k': '1~10만',
  '100k-1m': '10~100만',
  'over-1m': '100만+',
}

const LANGUAGE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
}

const TONE_LABELS: Record<string, string> = {
  formal: '격식체',
  casual: '반말',
  technical: '전문용어 중심',
}

const TASK_TYPE_LABELS: Record<string, string> = {
  'customer-support': '고객응대',
  'knowledge-management': '내부지식관리',
  'code-review': '코드리뷰',
  'data-analysis': '데이터분석',
  'document-writing': '문서작성',
  'translation': '번역',
}

export function BvaProfileSummary({ profile, categoryName }: BvaProfileSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">고객 프로필 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">업종</p>
            <p className="font-medium">{categoryName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">상담 유형</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {profile.taskTypes.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {TASK_TYPE_LABELS[t] ?? t}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">월간 볼륨</p>
            <p className="font-medium">{VOLUME_LABELS[profile.monthlyVolume] ?? profile.monthlyVolume}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">언어</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {profile.languages.map((l) => (
                <Badge key={l} variant="outline" className="text-xs">
                  {LANGUAGE_LABELS[l] ?? l}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">톤앤매너</p>
            <p className="font-medium">{TONE_LABELS[profile.tone] ?? profile.tone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">보안 요구사항</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {profile.security.onPremiseRequired && (
                <Badge variant="destructive" className="text-xs">온프레미스</Badge>
              )}
              {profile.security.personalDataHandling && (
                <Badge variant="destructive" className="text-xs">개인정보</Badge>
              )}
              {profile.security.regulatedIndustry && (
                <Badge variant="destructive" className="text-xs">규제 산업</Badge>
              )}
              {!profile.security.onPremiseRequired &&
                !profile.security.personalDataHandling &&
                !profile.security.regulatedIndustry && (
                <span className="text-sm text-muted-foreground">없음</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
