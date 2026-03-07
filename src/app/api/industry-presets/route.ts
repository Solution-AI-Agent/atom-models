import { NextRequest, NextResponse } from 'next/server'
import { getAllPresets } from '@/lib/services/preset.service'

export async function GET(request: NextRequest) {
  try {
    const presets = await getAllPresets()
    return NextResponse.json({ success: true, data: presets })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch presets' },
      { status: 500 },
    )
  }
}
