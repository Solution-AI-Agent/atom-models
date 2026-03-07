import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchIcon, GitCompareArrowsIcon, BriefcaseIcon, CpuIcon } from 'lucide-react'

const features = [
  {
    title: '모델 탐색',
    description: '필터, 정렬, 검색으로 최적 LLM을 찾아보세요',
    href: '/explore',
    icon: SearchIcon,
  },
  {
    title: '모델 비교',
    description: '최대 4개 모델을 나란히 비교하세요',
    href: '/compare',
    icon: GitCompareArrowsIcon,
  },
  {
    title: '산업별 추천',
    description: '업종과 업무에 맞는 모델 추천을 받으세요',
    href: '/recommendations',
    icon: BriefcaseIcon,
  },
  {
    title: 'GPU 레퍼런스',
    description: 'GPU별 성능과 비용을 비교하세요',
    href: '/gpu',
    icon: CpuIcon,
  },
] as const

export function QuickAccessCards() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">빠른 접근</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
