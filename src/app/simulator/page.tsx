export const dynamic = 'force-dynamic'

import { SimulatorClient } from '@/components/simulator/simulator-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '비용 시뮬레이터 - Atom Models',
  description: 'LLM API 비용, 셀프호스팅 손익분기점, 라우팅 절감 시뮬레이션',
}

export default function SimulatorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">비용 시뮬레이터</h1>
        <p className="text-muted-foreground mt-1">
          모델별 API 비용, 셀프호스팅 손익분기점, 라우팅 절감 효과를 시뮬레이션합니다.
        </p>
      </div>
      <SimulatorClient />
    </div>
  )
}
