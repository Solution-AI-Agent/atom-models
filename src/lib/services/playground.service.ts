import { getConnection } from '@/lib/db/connection'
import { PlaygroundSessionModel } from '@/lib/db/models/playground-session'
import { serialize } from '@/lib/utils/serialize'
import type { IPlaygroundSession, IPlaygroundSessionSummary } from '@/lib/types/playground'

export async function getSessions(): Promise<readonly IPlaygroundSessionSummary[]> {
  await getConnection()
  const sessions = await PlaygroundSessionModel
    .find()
    .sort({ createdAt: -1 })
    .select('title models.modelName models.provider messages createdAt')
    .lean()

  return serialize(sessions.map((s) => ({
    _id: String(s._id),
    title: s.title,
    models: s.models.map((m) => ({
      modelName: m.modelName,
      provider: m.provider,
    })),
    messageCount: s.messages.length,
    createdAt: s.createdAt,
  })))
}

export async function getSessionById(id: string): Promise<IPlaygroundSession | null> {
  await getConnection()
  const session = await PlaygroundSessionModel.findById(id).lean()
  if (!session) return null
  return serialize(session)
}

export async function createSession(data: {
  readonly title: string
  readonly models: readonly IPlaygroundSession['models'][number][]
  readonly systemPrompt: string
  readonly defaultParameters: IPlaygroundSession['defaultParameters']
}): Promise<IPlaygroundSession> {
  await getConnection()
  const session = await PlaygroundSessionModel.create({
    ...data,
    messages: [],
  })
  return serialize(session.toJSON())
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
  const session = await PlaygroundSessionModel.findByIdAndUpdate(
    id,
    { $push: { messages: { $each: messages } } },
    { new: true },
  ).lean()
  if (!session) return null
  return serialize(session)
}

export async function updateSessionTitle(
  id: string,
  title: string,
): Promise<void> {
  await getConnection()
  await PlaygroundSessionModel.findByIdAndUpdate(id, { title })
}
