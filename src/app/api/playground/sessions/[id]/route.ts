import { NextRequest, NextResponse } from 'next/server'
import {
  getSessionById,
  deleteSession,
  addMessagesToSession,
  updateSessionTitle,
} from '@/lib/services/playground.service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await getSessionById(id)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 },
      )
    }
    return NextResponse.json({ success: true, data: session })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.title) {
      await updateSessionTitle(id, body.title)
    }

    if (body.messages) {
      await addMessagesToSession(id, body.messages)
    }

    const session = await getSessionById(id)
    return NextResponse.json({ success: true, data: session })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await deleteSession(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 },
    )
  }
}
