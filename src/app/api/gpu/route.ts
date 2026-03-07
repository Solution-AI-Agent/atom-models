import { NextRequest, NextResponse } from 'next/server'
import { getGpuList } from '@/lib/services/gpu.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const minVram = searchParams.has('minVram') ? Number(searchParams.get('minVram')) : undefined

    const gpus = await getGpuList({ category, minVram })
    return NextResponse.json({ success: true, data: gpus })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GPU data' },
      { status: 500 },
    )
  }
}
