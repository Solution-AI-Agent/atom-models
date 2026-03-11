import { getConnection } from '@/lib/db/connection'
import { PlaygroundSessionModel, type IPlaygroundSessionDocument } from '@/lib/db/models/playground-session'
import { serialize } from '@/lib/utils/serialize'
import type { IPlaygroundSession, IPlaygroundSessionSummary } from '@/lib/types/playground'

const MAX_MESSAGES_PER_SESSION = 200

export async function getSessions(): Promise<readonly IPlaygroundSessionSummary[]> {
  await getConnection()
  const sessions = await PlaygroundSessionModel
    .find()
    .sort({ createdAt: -1 })
    .select('title models.modelName models.provider messages createdAt')
    .lean()

  return sessions.map((s) => {
    const doc = s as unknown as { _id: unknown; title: string; models: { modelName: string; provider: string }[]; messages: unknown[]; createdAt: Date }
    return serialize<IPlaygroundSessionSummary>({
      _id: String(doc._id),
      title: doc.title,
      models: doc.models.map((m) => ({
        modelName: m.modelName,
        provider: m.provider,
      })),
      messageCount: doc.messages.length,
      createdAt: doc.createdAt.toISOString(),
    })
  })
}

export async function getSessionById(id: string): Promise<IPlaygroundSession | null> {
  await getConnection()
  const session = await PlaygroundSessionModel.findById(id).lean()
  if (!session) return null
  return serialize(session) as unknown as IPlaygroundSession
}

export async function createSession(data: {
  readonly title: string
  readonly models: readonly IPlaygroundSession['models'][number][]
  readonly systemPrompt: string
  readonly defaultParameters: IPlaygroundSession['defaultParameters']
}): Promise<IPlaygroundSession> {
  await getConnection()
  const session = await PlaygroundSessionModel.create({
    title: data.title,
    models: [...data.models] as unknown as IPlaygroundSessionDocument['models'],
    systemPrompt: data.systemPrompt,
    defaultParameters: { ...data.defaultParameters },
    messages: [],
  })
  return serialize(session.toJSON()) as unknown as IPlaygroundSession
}

export async function deleteSession(id: string): Promise<void> {
  await getConnection()
  await PlaygroundSessionModel.findByIdAndDelete(id)
}

export async function addMessagesToSession(
  id: string,
  messages: readonly IPlaygroundSession['messages'][number][],
): Promise<IPlaygroundSession | null> {
  await getConnection()

  const current = await PlaygroundSessionModel.findById(id).select('messages').lean()
  if (!current) return null
  if (current.messages.length + messages.length > MAX_MESSAGES_PER_SESSION) {
    throw new Error('Session message limit exceeded')
  }

  const session = await PlaygroundSessionModel.findByIdAndUpdate(
    id,
    { $push: { messages: { $each: [...messages] } } },
    { new: true },
  ).lean()
  if (!session) return null
  return serialize(session) as unknown as IPlaygroundSession
}

export async function updateSessionTitle(
  id: string,
  title: string,
): Promise<void> {
  await getConnection()
  await PlaygroundSessionModel.findByIdAndUpdate(id, { title })
}
