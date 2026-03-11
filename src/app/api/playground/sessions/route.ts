import { NextResponse } from 'next/server'
import { getSessions, createSession } from '@/lib/services/playground.service'

export async function GET() {
  try {
    const sessions = await getSessions()
    return NextResponse.json({ success: true, data: sessions })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const session = await createSession(body)
    return NextResponse.json({ success: true, data: session }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 },
    )
  }
}
