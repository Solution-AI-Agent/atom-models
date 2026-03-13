import { z } from 'zod'
import {
  createEvaluationSession,
  updateSessionStatus,
  updateExperimentResult,
} from '@/lib/services/evaluation.service'
import {
  checkPhoenixHealth,
  createPhoenixDataset,
  buildEvaluators,
  runPhoenixExperiment,
} from '@/lib/services/phoenix.service'
import { completeChatCompletion } from '@/lib/services/openrouter.service'

const modelConfigSchema = z.object({
  modelId: z.string(),
  slug: z.string(),
  openRouterModelId: z.string(),
  modelName: z.string(),
  provider: z.string(),
  parameters: z.object({
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(128000),
  }),
})

const runRequestSchema = z.object({
  name: z.string().min(1).max(200),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(200),
  fileName: z.string(),
  columns: z.array(z.string()).min(1),
  models: z.array(modelConfigSchema).min(1).max(3),
  evaluators: z.array(z.enum(['correctness', 'relevance', 'hallucination'])).min(1),
  systemPrompt: z.string().max(10000).optional(),
  parameters: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(128000).optional(),
  }).optional(),
})

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_MINUTE = 3

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= MAX_REQUESTS_PER_MINUTE) return false
  rateLimitMap.set(ip, { ...entry, count: entry.count + 1 })
  return true
}

async function executeEvaluation(
  sessionId: string,
  validated: z.infer<typeof runRequestSchema>,
) {
  try {
    await updateSessionStatus(sessionId, 'running')

    const { datasetId } = await createPhoenixDataset({
      name: `${validated.name}-${Date.now()}`,
      rows: validated.rows,
    })

    const evaluators = await buildEvaluators(validated.evaluators)

    for (const model of validated.models) {
      try {
        const task = async (example: { input: Record<string, unknown> }) => {
          const question = String(example.input?.question ?? '')
          const messages: { role: 'system' | 'user'; content: string }[] = []

          if (validated.systemPrompt) {
            messages.push({ role: 'system', content: validated.systemPrompt })
          }
          messages.push({ role: 'user', content: question })

          const result = await completeChatCompletion({
            model: model.openRouterModelId,
            messages,
            temperature: model.parameters.temperature,
            maxTokens: model.parameters.maxTokens,
          })

          return result.content
        }

        const experiment = await runPhoenixExperiment({
          datasetId,
          experimentName: `${validated.name}-${model.slug}`,
          task,
          evaluators,
        })

        const runs = Object.values(experiment.runs ?? {})
        const evaluationRuns = experiment.evaluationRuns ?? []

        const results = validated.rows.map((row, index) => {
          const run = runs[index]
          const rowEvaluations = evaluationRuns.filter(
            (e) => e.experimentRunId === run?.id,
          )

          const evaluations: Record<string, { score: number; label: string; explanation: string }> = {}
          for (const evalRun of rowEvaluations) {
            if (evalRun.result) {
              evaluations[evalRun.name] = {
                score: evalRun.result.score ?? 0,
                label: evalRun.result.label ?? '',
                explanation: evalRun.result.explanation ?? '',
              }
            }
          }

          return {
            rowIndex: index,
            question: row.question ?? '',
            groundTruth: row.ground_truth ?? '',
            modelResponse: String(run?.output ?? ''),
            evaluations,
            latencyMs: run ? new Date(run.endTime).getTime() - new Date(run.startTime).getTime() : 0,
            tokenCount: { input: 0, output: 0 },
          }
        })

        const scores: Record<string, number> = {}
        for (const evalName of validated.evaluators) {
          const evalResults = results
            .map((r) => r.evaluations[evalName]?.score)
            .filter((s): s is number => s !== undefined)
          if (evalResults.length > 0) {
            scores[evalName] = evalResults.reduce((a, b) => a + b, 0) / evalResults.length
          }
        }

        const totalLatency = results.reduce((sum, r) => sum + r.latencyMs, 0)

        await updateExperimentResult(sessionId, model.slug, {
          status: 'completed',
          phoenixExperimentId: experiment.id,
          scores,
          results,
          metrics: {
            avgLatencyMs: results.length > 0 ? totalLatency / results.length : 0,
            totalTokens: { input: 0, output: 0 },
            estimatedCost: 0,
          },
        })
      } catch {
        await updateExperimentResult(sessionId, model.slug, {
          status: 'failed',
          phoenixExperimentId: '',
          scores: {},
          results: [],
          metrics: {
            avgLatencyMs: 0,
            totalTokens: { input: 0, output: 0 },
            estimatedCost: 0,
          },
        })
      }
    }

    await updateSessionStatus(sessionId, 'completed')
  } catch {
    await updateSessionStatus(sessionId, 'failed')
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(clientIp)) {
      return Response.json(
        { success: false, error: 'Rate limit exceeded. Maximum 3 evaluations per minute.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = runRequestSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { success: false, error: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}` },
        { status: 400 },
      )
    }

    const validated = parsed.data

    const phoenixHealthy = await checkPhoenixHealth()
    if (!phoenixHealthy) {
      return Response.json(
        { success: false, error: 'Phoenix service is unavailable. Please try again later.' },
        { status: 503 },
      )
    }

    const session = await createEvaluationSession({
      name: validated.name,
      config: {
        models: validated.models,
        evaluators: validated.evaluators,
        systemPrompt: validated.systemPrompt,
      },
      dataset: {
        fileName: validated.fileName,
        rowCount: validated.rows.length,
        columns: validated.columns,
      },
    })

    // Fire-and-forget execution
    executeEvaluation(String(session._id), validated)

    return Response.json(
      { success: true, data: { sessionId: session._id } },
      { status: 202 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start evaluation'
    return Response.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
