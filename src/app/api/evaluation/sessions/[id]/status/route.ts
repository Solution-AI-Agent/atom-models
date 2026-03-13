import mongoose from 'mongoose'
import { getEvaluationProgress } from '@/lib/services/evaluation.service'

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    if (!isValidObjectId(id)) {
      return Response.json(
        { success: false, error: 'Invalid session ID' },
        { status: 400 },
      )
    }

    const progress = await getEvaluationProgress(id)
    if (!progress) {
      return Response.json(
        { success: false, error: 'Session not found' },
        { status: 404 },
      )
    }

    return Response.json({ success: true, data: progress })
  } catch {
    return Response.json(
      { success: false, error: 'Failed to fetch evaluation status' },
      { status: 500 },
    )
  }
}
