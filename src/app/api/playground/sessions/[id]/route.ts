import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import mongoose from 'mongoose'
import {
  getSessionById,
  deleteSession,
  addMessagesToSession,
  updateSessionTitle,
} from '@/lib/services/playground.service'

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id)
}

const patchSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(50000),
    modelId: z.string().optional(),
    metrics: z.object({
      ttft: z.number(),
      totalTime: z.number(),
      tps: z.number(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      estimatedCost: z.number(),
    }).optional(),
  })).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID' },
        { status: 400 },
      )
    }

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
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const parsed = patchSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}` },
        { status: 400 },
      )
    }

    if (parsed.data.title) {
      await updateSessionTitle(id, parsed.data.title)
    }

    if (parsed.data.messages) {
      await addMessagesToSession(id, parsed.data.messages)
    }

    const session = await getSessionById(id)
    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update session'
    const status = message === 'Session message limit exceeded' ? 400 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID' },
        { status: 400 },
      )
    }

    await deleteSession(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 },
    )
  }
}
