import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { SearchIcon, GitCompareArrowsIcon } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="flex flex-col gap-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Atom Models
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        LLM 모델을 비교하고, 산업별 최적 모델을 추천받으세요.
        비용 시뮬레이션과 인프라 요구사항까지 한눈에 파악할 수 있습니다.
      </p>
      <div className="flex gap-3 pt-2">
        <Link href="/explore" className={buttonVariants()}>
          <SearchIcon className="mr-2 h-4 w-4" />
          모델 탐색
        </Link>
        <Link href="/compare" className={buttonVariants({ variant: 'outline' })}>
          <GitCompareArrowsIcon className="mr-2 h-4 w-4" />
          모델 비교
        </Link>
      </div>
    </section>
  )
}
