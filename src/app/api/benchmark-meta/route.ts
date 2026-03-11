import { NextResponse } from 'next/server'
import { getAllBenchmarkMeta } from '@/lib/services/bva.service'

export async function GET() {
  try {
    const metas = await getAllBenchmarkMeta()
    return NextResponse.json(metas)
  } catch (error) {
    console.error('Failed to fetch benchmark meta:', error)
    return NextResponse.json(
      { error: 'Failed to fetch benchmark metadata' },
      { status: 500 },
    )
  }
}
