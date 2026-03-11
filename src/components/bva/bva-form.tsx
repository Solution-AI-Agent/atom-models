'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import type { BvaVolumeTier, BvaTone, BvaSupportedLanguage } from '@/lib/types/bva'

interface BvaFormProps {
  readonly categories: readonly { category: string; categorySlug: string }[]
}

const TASK_TYPES = [
  { label: '고객응대', value: 'customer-support' },
  { label: '내부지식관리', value: 'knowledge-management' },
  { label: '코드리뷰', value: 'code-review' },
  { label: '데이터분석', value: 'data-analysis' },
  { label: '문서작성', value: 'document-writing' },
  { label: '번역', value: 'translation' },
] as const

const VOLUME_OPTIONS: readonly { label: string; value: BvaVolumeTier }[] = [
  { label: '1만 이하', value: 'under-10k' },
  { label: '1~10만', value: '10k-100k' },
  { label: '10~100만', value: '100k-1m' },
  { label: '100만+', value: 'over-1m' },
] as const

const LANGUAGE_OPTIONS: readonly { label: string; value: BvaSupportedLanguage }[] = [
  { label: '한국어', value: 'ko' },
  { label: '영어', value: 'en' },
  { label: '일본어', value: 'ja' },
  { label: '중국어', value: 'zh' },
] as const

const TONE_OPTIONS: readonly { label: string; value: BvaTone }[] = [
  { label: '격식체', value: 'formal' },
  { label: '반말', value: 'casual' },
  { label: '전문용어 중심', value: 'technical' },
] as const

const SECURITY_OPTIONS = [
  { label: '온프레미스 필수', key: 'onPremiseRequired' as const },
  { label: '개인정보 처리', key: 'personalDataHandling' as const },
  { label: '규제 산업', key: 'regulatedIndustry' as const },
] as const

export function BvaForm({ categories }: BvaFormProps) {
  const router = useRouter()
  const [industry, setIndustry] = useState('')
  const [taskTypes, setTaskTypes] = useState<string[]>([])
  const [monthlyVolume, setMonthlyVolume] = useState<BvaVolumeTier>('under-10k')
  const [languages, setLanguages] = useState<BvaSupportedLanguage[]>(['ko'])
  const [tone, setTone] = useState<BvaTone>('formal')
  const [security, setSecurity] = useState({
    onPremiseRequired: false,
    personalDataHandling: false,
    regulatedIndustry: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleTaskTypeToggle(value: string) {
    setTaskTypes((prev) =>
      prev.includes(value)
        ? prev.filter((t) => t !== value)
        : [...prev, value],
    )
  }

  function handleLanguageToggle(value: BvaSupportedLanguage) {
    setLanguages((prev) =>
      prev.includes(value)
        ? prev.filter((l) => l !== value)
        : [...prev, value],
    )
  }

  function handleSecurityToggle(key: keyof typeof security) {
    setSecurity((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit() {
    if (!industry || taskTypes.length === 0) return

    setIsSubmitting(true)

    const params = new URLSearchParams({
      industry,
      taskTypes: taskTypes.join(','),
      monthlyVolume,
      languages: languages.join(','),
      tone,
      onPremiseRequired: String(security.onPremiseRequired),
      personalDataHandling: String(security.personalDataHandling),
      regulatedIndustry: String(security.regulatedIndustry),
    })

    router.push(`/bva/result?${params.toString()}`)
  }

  const isFormValid = industry !== '' && taskTypes.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">업종</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={industry} onValueChange={(v) => setIndustry(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="업종을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.categorySlug} value={cat.categorySlug}>
                  {cat.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">상담 유형</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TASK_TYPES.map((task) => (
              <label
                key={task.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={taskTypes.includes(task.value)}
                  onCheckedChange={() => handleTaskTypeToggle(task.value)}
                />
                <span className="text-sm">{task.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">월간 볼륨 (요청 수)</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={monthlyVolume}
            onValueChange={(v) => setMonthlyVolume(v as BvaVolumeTier)}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {VOLUME_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`vol-${opt.value}`} />
                  <Label htmlFor={`vol-${opt.value}`} className="cursor-pointer text-sm">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">언어</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {LANGUAGE_OPTIONS.map((lang) => (
              <label
                key={lang.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={languages.includes(lang.value)}
                  onCheckedChange={() => handleLanguageToggle(lang.value)}
                />
                <span className="text-sm">{lang.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">톤앤매너</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={tone}
            onValueChange={(v) => setTone(v as BvaTone)}
          >
            <div className="flex flex-wrap gap-4">
              {TONE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`tone-${opt.value}`} />
                  <Label htmlFor={`tone-${opt.value}`} className="cursor-pointer text-sm">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">보안 요구사항</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {SECURITY_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={security[opt.key]}
                  onCheckedChange={() => handleSecurityToggle(opt.key)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={!isFormValid || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? '분석 중...' : 'BVA 분석 시작'}
      </Button>
    </div>
  )
}
