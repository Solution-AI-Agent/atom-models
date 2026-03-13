import { getConnection } from '@/lib/db/connection'
import { EvaluationSessionModel } from '@/lib/db/models/evaluation-session'
import { serialize } from '@/lib/utils/serialize'
import type {
  EvaluationStatus,
  IEvaluationConfig,
  IEvaluationDatasetInfo,
  IEvaluationProgress,
  IEvaluationSession,
  IEvaluationSessionSummary,
  IExperimentResult,
} from '@/lib/types/evaluation'

interface CreateSessionInput {
  readonly name: string
  readonly config: {
    readonly models: IEvaluationConfig['models']
    readonly evaluators: IEvaluationConfig['evaluators']
    readonly systemPrompt?: string
  }
  readonly dataset: IEvaluationDatasetInfo
}

export async function createEvaluationSession(
  input: CreateSessionInput,
): Promise<IEvaluationSession> {
  await getConnection()

  const experiments = input.config.models.map((model) => ({
    modelSlug: model.slug,
    phoenixExperimentId: '',
    status: 'pending' as const,
    scores: {},
    results: [],
    metrics: {
      avgLatencyMs: 0,
      totalTokens: { input: 0, output: 0 },
      estimatedCost: 0,
    },
  }))

  const doc = await EvaluationSessionModel.create({
    name: input.name,
    status: 'pending',
    config: {
      models: input.config.models,
      evaluators: input.config.evaluators,
      systemPrompt: input.config.systemPrompt,
    },
    dataset: input.dataset,
    experiments,
  })

  return serialize(doc.toJSON())
}

export async function getEvaluationSessions(): Promise<readonly IEvaluationSessionSummary[]> {
  await getConnection()

  const sessions = await EvaluationSessionModel
    .find()
    .sort({ createdAt: -1 })
    .select('name status dataset config.models createdAt')
    .lean()

  return serialize(
    sessions.map((s) => ({
      _id: s._id,
      name: s.name,
      status: s.status,
      dataset: s.dataset,
      modelCount: s.config?.models?.length ?? 0,
      createdAt: s.createdAt,
    })),
  )
}

export async function getEvaluationSessionById(
  id: string,
): Promise<IEvaluationSession | null> {
  await getConnection()

  const session = await EvaluationSessionModel.findById(id).lean()
  if (!session) return null

  return serialize(session)
}

export async function updateSessionStatus(
  id: string,
  status: EvaluationStatus,
): Promise<void> {
  await getConnection()

  const update: Record<string, unknown> = { status }
  if (status === 'running') {
    update.startedAt = new Date()
  }
  if (status === 'completed' || status === 'failed') {
    update.completedAt = new Date()
  }

  await EvaluationSessionModel.findByIdAndUpdate(id, update)
}

export async function updateExperimentResult(
  sessionId: string,
  modelSlug: string,
  result: {
    readonly status: EvaluationStatus
    readonly phoenixExperimentId: string
    readonly scores: Partial<Record<string, number>>
    readonly results: IExperimentResult['results']
    readonly metrics: IExperimentResult['metrics']
  },
): Promise<void> {
  await getConnection()

  await EvaluationSessionModel.findByIdAndUpdate(
    sessionId,
    {
      $set: {
        'experiments.$[elem].status': result.status,
        'experiments.$[elem].phoenixExperimentId': result.phoenixExperimentId,
        'experiments.$[elem].scores': result.scores,
        'experiments.$[elem].results': result.results,
        'experiments.$[elem].metrics': result.metrics,
      },
    },
    {
      arrayFilters: [{ 'elem.modelSlug': modelSlug }],
    },
  )
}

export async function getEvaluationProgress(
  id: string,
): Promise<IEvaluationProgress | null> {
  await getConnection()

  const session = await EvaluationSessionModel.findById(id).lean()
  if (!session) return null

  const totalModels = session.config?.models?.length ?? 0
  const totalPerModel = session.dataset?.rowCount ?? 0
  const total = totalModels * totalPerModel

  const completed = (session.experiments ?? []).reduce(
    (sum, exp) => sum + (exp.results?.length ?? 0),
    0,
  )

  return {
    status: session.status,
    progress: { completed, total },
    experiments: (session.experiments ?? []).map((exp) => ({
      modelSlug: exp.modelSlug,
      status: exp.status,
    })),
  }
}
