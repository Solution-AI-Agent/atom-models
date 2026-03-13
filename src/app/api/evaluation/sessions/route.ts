import { getEvaluationSessions } from '@/lib/services/evaluation.service'

export async function GET() {
  try {
    const sessions = await getEvaluationSessions()
    return Response.json({ success: true, data: sessions })
  } catch {
    return Response.json(
      { success: false, error: 'Failed to fetch evaluation sessions' },
      { status: 500 },
    )
  }
}
