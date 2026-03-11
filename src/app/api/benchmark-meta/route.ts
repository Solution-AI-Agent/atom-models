import { NextResponse } from 'next/server'
import { getAllRefBenchmarks } from '@/lib/services/bva.service'

export async function GET() {
  try {
    const benchmarks = await getAllRefBenchmarks()
    return NextResponse.json(benchmarks)
  } catch (error) {
    console.error('Failed to fetch benchmark meta:', error)
    return NextResponse.json(
      { error: 'Failed to fetch benchmark metadata' },
      { status: 500 },
    )
  }
}
