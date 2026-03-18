import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessions, createSession } from '@/lib/services/playground.service'

const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  models: z.array(z.object({
    modelId: z.string(),
    modelName: z.string(),
    provider: z.string(),
    openRouterModelId: z.string(),
    colorCode: z.string().optional(),
    parameters: z.object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).max(128000).optional(),
      topP: z.number().min(0).max(1).optional(),
      reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
    }).optional(),
  })).min(1).max(3),
  systemPrompt: z.string().max(10000).default(''),
  defaultParameters: z.object({
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(128000),
    topP: z.number().min(0).max(1),
    reasoningEffort: z.enum(['low', 'medium', 'high']),
  }),
})

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
    const parsed = createSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}` },
        { status: 400 },
      )
    }

    const session = await createSession(parsed.data as Parameters<typeof createSession>[0])
    return NextResponse.json({ success: true, data: session }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 },
    )
  }
}
