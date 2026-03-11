# Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a model comparison playground where users send prompts to up to 3 LLM models via OpenRouter and compare streaming responses side-by-side with performance metrics.

**Architecture:** Next.js App Router page at `/playground` with client-side streaming via individual fetch calls per model. Server API routes proxy to OpenRouter with SSE streaming. Sessions stored in MongoDB for replay. Desktop shows 1-3 columns; mobile stacks vertically.

**Tech Stack:** Next.js 16, React 19, Mongoose 9, OpenRouter API (SSE streaming), shadcn/ui, Tailwind CSS

---

## Team Assignments

| Agent | Tasks |
|-------|-------|
| **lead** | Task 1 (shared types), coordination, integration review |
| **backend-dev** | Tasks 2-7 (schema, service, API routes, OpenRouter streaming) |
| **frontend-dev** | Tasks 8-15 (sidebar, components, hooks, responsive) |
| **seed-mapper** | Tasks 16-18 (OpenRouter model ID research, seed data) |

## Dependencies

```
Task 1 (types) → Tasks 2-7 (backend), Tasks 8-15 (frontend)
Task 2 (mongoose model) → Task 4 (service)
Task 4 (service) → Tasks 5, 7 (API routes)
Task 6 (openrouter service) → Task 7 (chat route)
Task 16-18 (seed) → independent, no blockers
```

---

## Task 1: Shared Playground Types

**Owner:** lead
**Files:**
- Create: `src/lib/types/playground.ts`

**Step 1: Create playground types**

```typescript
// src/lib/types/playground.ts

export interface IPlaygroundMessageMetrics {
  readonly ttft: number
  readonly totalTime: number
  readonly tps: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCost: number
}

export interface IPlaygroundMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly modelId?: string
  readonly metrics?: IPlaygroundMessageMetrics
  readonly createdAt?: string
}

export interface IPlaygroundModelConfig {
  readonly modelId: string
  readonly modelName?: string
  readonly provider?: string
  readonly openRouterModelId?: string
  readonly colorCode?: string
  readonly parameters: IPlaygroundParameters
}

export interface IPlaygroundParameters {
  readonly temperature: number
  readonly maxTokens: number
  readonly topP: number
}

export const DEFAULT_PARAMETERS: IPlaygroundParameters = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
}

export interface IPlaygroundSession {
  readonly _id?: string
  readonly title: string
  readonly models: readonly IPlaygroundModelConfig[]
  readonly systemPrompt: string
  readonly messages: readonly IPlaygroundMessage[]
  readonly defaultParameters: IPlaygroundParameters
  readonly createdAt?: string
  readonly updatedAt?: string
}

export interface IPlaygroundSessionSummary {
  readonly _id: string
  readonly title: string
  readonly models: readonly {
    readonly modelName?: string
    readonly provider?: string
  }[]
  readonly messageCount: number
  readonly createdAt: string
}

export interface IPlaygroundChatRequest {
  readonly sessionId: string
  readonly modelId: string
  readonly openRouterModelId: string
  readonly messages: readonly {
    readonly role: 'system' | 'user' | 'assistant'
    readonly content: string
  }[]
  readonly parameters: IPlaygroundParameters
}

export interface IPlaygroundChatStreamEvent {
  readonly type: 'token' | 'done' | 'error'
  readonly content?: string
  readonly usage?: {
    readonly promptTokens: number
    readonly completionTokens: number
  }
  readonly error?: string
}
```

**Step 2: Add openRouterModelId to IModel type**

Modify: `src/lib/types/model.ts:39-63`

Add `readonly openRouterModelId?: string` field to `IModel` interface after `colorCode`.

**Step 3: Commit**

```bash
git add src/lib/types/playground.ts src/lib/types/model.ts
git commit -m "feat: add playground types and openRouterModelId to IModel"
```

---

## Task 2: PlaygroundSession Mongoose Model

**Owner:** backend-dev
**Depends on:** Task 1
**Files:**
- Create: `src/lib/db/models/playground-session.ts`
- Create: `src/__tests__/lib/db/models/playground-session.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/db/models/playground-session.test.ts
/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals'

describe('PlaygroundSession Model', () => {
  it('should export PlaygroundSessionModel', async () => {
    const { PlaygroundSessionModel } = await import(
      '@/lib/db/models/playground-session'
    )
    expect(PlaygroundSessionModel).toBeDefined()
    expect(PlaygroundSessionModel.modelName).toBe('PlaygroundSession')
  })

  it('should have required fields in schema', async () => {
    const { PlaygroundSessionModel } = await import(
      '@/lib/db/models/playground-session'
    )
    const schemaPaths = PlaygroundSessionModel.schema.paths
    expect(schemaPaths.title).toBeDefined()
    expect(schemaPaths.systemPrompt).toBeDefined()
    expect(schemaPaths['defaultParameters.temperature']).toBeDefined()
    expect(schemaPaths['defaultParameters.maxTokens']).toBeDefined()
    expect(schemaPaths['defaultParameters.topP']).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/db/models/playground-session.test.ts --no-coverage`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```typescript
// src/lib/db/models/playground-session.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPlaygroundSessionDocument extends Document {
  title: string
  models: {
    modelId: mongoose.Types.ObjectId
    modelName: string
    provider: string
    openRouterModelId: string
    colorCode: string
    parameters: {
      temperature?: number
      maxTokens?: number
      topP?: number
    }
  }[]
  systemPrompt: string
  messages: {
    role: 'user' | 'assistant'
    content: string
    modelId?: mongoose.Types.ObjectId
    metrics?: {
      ttft: number
      totalTime: number
      tps: number
      inputTokens: number
      outputTokens: number
      estimatedCost: number
    }
    createdAt: Date
  }[]
  defaultParameters: {
    temperature: number
    maxTokens: number
    topP: number
  }
}

const PlaygroundSessionSchema = new Schema({
  title: { type: String, required: true },
  models: [{
    modelId:           { type: Schema.Types.ObjectId, ref: 'Model', required: true },
    modelName:         { type: String, required: true },
    provider:          { type: String, required: true },
    openRouterModelId: { type: String, required: true },
    colorCode:         { type: String, default: '#888888' },
    parameters: {
      temperature: Number,
      maxTokens:   Number,
      topP:        Number,
    },
  }],
  systemPrompt: { type: String, default: '' },
  messages: [{
    role:      { type: String, enum: ['user', 'assistant'], required: true },
    content:   { type: String, required: true },
    modelId:   { type: Schema.Types.ObjectId, ref: 'Model' },
    metrics: {
      ttft:           Number,
      totalTime:      Number,
      tps:            Number,
      inputTokens:    Number,
      outputTokens:   Number,
      estimatedCost:  Number,
    },
    createdAt: { type: Date, default: Date.now },
  }],
  defaultParameters: {
    temperature: { type: Number, default: 0.7 },
    maxTokens:   { type: Number, default: 4096 },
    topP:        { type: Number, default: 1.0 },
  },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
})

PlaygroundSessionSchema.index({ createdAt: -1 })

export const PlaygroundSessionModel: Model<IPlaygroundSessionDocument> =
  mongoose.models.PlaygroundSession ||
  mongoose.model<IPlaygroundSessionDocument>('PlaygroundSession', PlaygroundSessionSchema)
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/db/models/playground-session.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/db/models/playground-session.ts src/__tests__/lib/db/models/playground-session.test.ts
git commit -m "feat: add PlaygroundSession Mongoose model"
```

---

## Task 3: Model Schema Extension (openRouterModelId)

**Owner:** backend-dev
**Depends on:** Task 1
**Files:**
- Modify: `src/lib/db/models/model.ts:3` (add to interface)
- Modify: `src/lib/db/models/model.ts:52-108` (add to schema)

**Step 1: Add openRouterModelId to IModelDocument interface**

At line 48 (after `colorCode: string`), add:
```typescript
  openRouterModelId: string | null
```

**Step 2: Add openRouterModelId to ModelSchema**

After `colorCode: String,` (line 102), add:
```typescript
  openRouterModelId: { type: String, default: null },
```

**Step 3: Run existing model tests to verify no breakage**

Run: `npx jest src/__tests__/lib/db/models/ --no-coverage`
Expected: PASS (all existing tests still pass)

**Step 4: Commit**

```bash
git add src/lib/db/models/model.ts
git commit -m "feat: add openRouterModelId field to Model schema"
```

---

## Task 4: Playground Session Service

**Owner:** backend-dev
**Depends on:** Task 2
**Files:**
- Create: `src/lib/services/playground.service.ts`
- Create: `src/__tests__/lib/services/playground.service.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/services/playground.service.test.ts
/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { MockedFunction } from 'jest-mock'

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

const mockFind = jest.fn()
const mockFindById = jest.fn()
const mockCreate = jest.fn()
const mockFindByIdAndDelete = jest.fn()
const mockFindByIdAndUpdate = jest.fn()
const mockCountDocuments = jest.fn()
const mockSort = jest.fn().mockReturnThis()
const mockSelect = jest.fn().mockReturnThis()
const mockLean = jest.fn()

jest.mock('@/lib/db/models/playground-session', () => ({
  PlaygroundSessionModel: {
    find: mockFind.mockReturnValue({ sort: mockSort }),
    findById: mockFindById.mockReturnValue({ lean: mockLean }),
    create: mockCreate,
    findByIdAndDelete: mockFindByIdAndDelete,
    findByIdAndUpdate: mockFindByIdAndUpdate.mockReturnValue({ lean: jest.fn() }),
    countDocuments: mockCountDocuments,
  },
}))

describe('PlaygroundService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSort.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ lean: mockLean })
  })

  it('getSessions returns session list', async () => {
    const mockSessions = [
      { _id: '1', title: 'Test', models: [], messages: [], createdAt: new Date() },
    ]
    mockLean.mockResolvedValueOnce(mockSessions)

    const { getSessions } = await import('@/lib/services/playground.service')
    const result = await getSessions()
    expect(result).toBeDefined()
    expect(mockFind).toHaveBeenCalled()
  })

  it('createSession creates and returns session', async () => {
    const input = {
      title: 'Test Session',
      models: [],
      systemPrompt: 'You are helpful.',
      defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
    }
    const mockDoc = { ...input, _id: '123', messages: [], toJSON: () => ({ ...input, _id: '123' }) }
    mockCreate.mockResolvedValueOnce(mockDoc)

    const { createSession } = await import('@/lib/services/playground.service')
    const result = await createSession(input)
    expect(result).toBeDefined()
    expect(mockCreate).toHaveBeenCalled()
  })

  it('deleteSession calls findByIdAndDelete', async () => {
    mockFindByIdAndDelete.mockResolvedValueOnce({ _id: '123' })

    const { deleteSession } = await import('@/lib/services/playground.service')
    await deleteSession('123')
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith('123')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/services/playground.service.test.ts --no-coverage`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```typescript
// src/lib/services/playground.service.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/services/playground.service.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/services/playground.service.ts src/__tests__/lib/services/playground.service.test.ts
git commit -m "feat: add playground session service with CRUD operations"
```

---

## Task 5: Session CRUD API Routes

**Owner:** backend-dev
**Depends on:** Task 4
**Files:**
- Create: `src/app/api/playground/sessions/route.ts`
- Create: `src/app/api/playground/sessions/[id]/route.ts`
- Create: `src/__tests__/app/api/playground/sessions/route.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/app/api/playground/sessions/route.test.ts
/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('@/lib/services/playground.service', () => ({
  getSessions: jest.fn(),
  createSession: jest.fn(),
}))

import { GET, POST } from '@/app/api/playground/sessions/route'
import { getSessions, createSession } from '@/lib/services/playground.service'
import type { MockedFunction } from 'jest-mock'

const mockedGetSessions = getSessions as MockedFunction<typeof getSessions>
const mockedCreateSession = createSession as MockedFunction<typeof createSession>

describe('GET /api/playground/sessions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns session list', async () => {
    const mockData = [{ _id: '1', title: 'Test', models: [], messageCount: 0, createdAt: '2026-03-11' }]
    mockedGetSessions.mockResolvedValueOnce(mockData)

    const response = await GET()
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual(mockData)
  })
})

describe('POST /api/playground/sessions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a new session', async () => {
    const input = {
      title: 'New Session',
      models: [],
      systemPrompt: '',
      defaultParameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
    }
    const mockResult = { ...input, _id: '123', messages: [] }
    mockedCreateSession.mockResolvedValueOnce(mockResult as any)

    const request = new Request('http://localhost/api/playground/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const response = await POST(request)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data._id).toBe('123')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/app/api/playground/sessions/route.test.ts --no-coverage`
Expected: FAIL

**Step 3: Implement session list + create routes**

```typescript
// src/app/api/playground/sessions/route.ts
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
```

```typescript
// src/app/api/playground/sessions/[id]/route.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/app/api/playground/sessions/route.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/playground/sessions/
git add src/__tests__/app/api/playground/sessions/
git commit -m "feat: add playground session CRUD API routes"
```

---

## Task 6: OpenRouter Streaming Service

**Owner:** backend-dev
**Depends on:** None (can start after Task 1)
**Files:**
- Create: `src/lib/services/openrouter.service.ts`
- Create: `src/__tests__/lib/services/openrouter.service.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/services/openrouter.service.test.ts
/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

describe('OpenRouterService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('should export streamChatCompletion function', async () => {
    const { streamChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )
    expect(typeof streamChatCompletion).toBe('function')
  })

  it('should throw if OPENROUTER_API_KEY is not set', async () => {
    delete process.env.OPENROUTER_API_KEY
    const { streamChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await expect(
      streamChatCompletion({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
        parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
      }),
    ).rejects.toThrow('OPENROUTER_API_KEY')
  })

  it('should call OpenRouter API with correct params', async () => {
    const mockResponse = new Response('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
    mockFetch.mockResolvedValueOnce(mockResponse)

    const { streamChatCompletion } = await import(
      '@/lib/services/openrouter.service'
    )

    await streamChatCompletion({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
      parameters: { temperature: 0.7, maxTokens: 4096, topP: 1.0 },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/services/openrouter.service.test.ts --no-coverage`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/services/openrouter.service.ts
import type { IPlaygroundParameters } from '@/lib/types/playground'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

interface StreamChatOptions {
  readonly model: string
  readonly messages: readonly ChatMessage[]
  readonly parameters: IPlaygroundParameters
}

export async function streamChatCompletion(
  options: StreamChatOptions,
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.parameters.temperature,
      max_tokens: options.parameters.maxTokens,
      top_p: options.parameters.topP,
      stream: true,
      stream_options: { include_usage: true },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${error}`)
  }

  return response
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/services/openrouter.service.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/services/openrouter.service.ts src/__tests__/lib/services/openrouter.service.test.ts
git commit -m "feat: add OpenRouter streaming service"
```

---

## Task 7: Chat Streaming API Route

**Owner:** backend-dev
**Depends on:** Task 6
**Files:**
- Create: `src/app/api/playground/chat/route.ts`
- Create: `src/__tests__/app/api/playground/chat/route.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/app/api/playground/chat/route.test.ts
/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('@/lib/services/openrouter.service', () => ({
  streamChatCompletion: jest.fn(),
}))

describe('POST /api/playground/chat', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should export POST handler', async () => {
    const { POST } = await import('@/app/api/playground/chat/route')
    expect(typeof POST).toBe('function')
  })

  it('should return 400 if required fields missing', async () => {
    const { POST } = await import('@/app/api/playground/chat/route')

    const request = new Request('http://localhost/api/playground/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/app/api/playground/chat/route.test.ts --no-coverage`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/app/api/playground/chat/route.ts
import { streamChatCompletion } from '@/lib/services/openrouter.service'
import type { IPlaygroundChatRequest } from '@/lib/types/playground'

export async function POST(request: Request) {
  try {
    const body: IPlaygroundChatRequest = await request.json()

    if (!body.openRouterModelId || !body.messages || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const openRouterResponse = await streamChatCompletion({
      model: body.openRouterModelId,
      messages: body.messages,
      parameters: body.parameters,
    })

    if (!openRouterResponse.body) {
      return new Response(
        JSON.stringify({ success: false, error: 'No stream body from OpenRouter' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const reader = openRouterResponse.body.getReader()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()

              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                return
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                const usage = parsed.usage || null

                const event: Record<string, unknown> = { type: 'token', content }
                if (usage) {
                  event.type = 'done'
                  event.usage = {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                  }
                }

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                )
              } catch {
                // skip unparseable lines
              }
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Stream error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`),
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to start chat stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/app/api/playground/chat/route.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/playground/chat/route.ts src/__tests__/app/api/playground/chat/route.test.ts
git commit -m "feat: add playground chat streaming API route"
```

---

## Task 8: Sidebar Menu Update

**Owner:** frontend-dev
**Depends on:** None
**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Add playground menu item**

In `src/components/layout/app-sidebar.tsx`, add `FlaskConicalIcon` to lucide-react imports.

Add to `navItems` array after the BVA item:
```typescript
{ title: '플레이그라운드', href: '/playground', icon: FlaskConicalIcon },
```

**Step 2: Verify visually**

Run: `npm run dev`
Check: Sidebar shows "플레이그라운드" menu item with flask icon.

**Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add playground menu item to sidebar"
```

---

## Task 9: Playground Page Shell + PlaygroundHeader

**Owner:** frontend-dev
**Depends on:** Task 1
**Files:**
- Create: `src/app/playground/page.tsx`
- Create: `src/components/playground/playground-header.tsx`

**Step 1: Create page shell**

```typescript
// src/app/playground/page.tsx
'use client'

import { useState } from 'react'
import { PlaygroundHeader } from '@/components/playground/playground-header'
import type { IPlaygroundSessionSummary } from '@/lib/types/playground'

export default function PlaygroundPage() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
      <PlaygroundHeader
        currentSessionId={currentSessionId}
        onNewSession={() => setCurrentSessionId(null)}
        onSelectSession={setCurrentSessionId}
      />
      <div className="flex-1 overflow-hidden p-4">
        <p className="text-muted-foreground">Setup area placeholder</p>
      </div>
    </div>
  )
}
```

**Step 2: Create PlaygroundHeader**

```typescript
// src/components/playground/playground-header.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { IPlaygroundSessionSummary } from '@/lib/types/playground'

interface PlaygroundHeaderProps {
  readonly currentSessionId: string | null
  readonly onNewSession: () => void
  readonly onSelectSession: (id: string) => void
}

export function PlaygroundHeader({
  currentSessionId,
  onNewSession,
  onSelectSession,
}: PlaygroundHeaderProps) {
  const [sessions, setSessions] = useState<readonly IPlaygroundSessionSummary[]>([])
  const [open, setOpen] = useState(false)

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/playground/sessions')
    if (!res.ok) return
    const json = await res.json()
    if (json.success) setSessions(json.data)
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleSelect = useCallback((id: string) => {
    onSelectSession(id)
    setOpen(false)
  }, [onSelectSession])

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/playground/sessions/${id}`, { method: 'DELETE' })
    setSessions((prev) => prev.filter((s) => s._id !== id))
    if (currentSessionId === id) onNewSession()
  }, [currentSessionId, onNewSession])

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="text-lg font-semibold">플레이그라운드</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onNewSession}>
          <Plus className="mr-1 h-4 w-4" />
          새 세션
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <History className="mr-1 h-4 w-4" />
              세션 기록
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>세션 기록</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">저장된 세션이 없습니다.</p>
              )}
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="flex items-start justify-between rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleSelect(session._id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.models.map((m) => m.modelName).join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.messageCount}개 메시지 | {new Date(session.createdAt).toLocaleDateString('ko')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(session._id)
                    }}
                    className="text-destructive"
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
```

**Step 3: Verify visually**

Run: `npm run dev`, navigate to `/playground`.
Check: Header with title, "새 세션" and "세션 기록" buttons visible.

**Step 4: Commit**

```bash
git add src/app/playground/page.tsx src/components/playground/playground-header.tsx
git commit -m "feat: add playground page shell and header component"
```

---

## Task 10: PlaygroundSetup (ModelSelector + Parameters)

**Owner:** frontend-dev
**Depends on:** Task 1
**Files:**
- Create: `src/components/playground/playground-setup.tsx`
- Create: `src/components/playground/model-selector.tsx`
- Create: `src/components/playground/parameter-panel.tsx`

**Step 1: Create ModelSelector**

```typescript
// src/components/playground/model-selector.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { IModel } from '@/lib/types/model'

const MAX_MODELS = 3

interface ModelSelectorProps {
  readonly selectedModels: readonly IModel[]
  readonly onModelsChange: (models: readonly IModel[]) => void
}

export function ModelSelector({ selectedModels, onModelsChange }: ModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<readonly IModel[]>([])
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    async function fetchModels() {
      const res = await fetch('/api/models?limit=200')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        const withOpenRouter = json.data.filter(
          (m: IModel) => m.openRouterModelId,
        )
        setAvailableModels(withOpenRouter)
      }
    }
    fetchModels()
  }, [])

  const filtered = availableModels.filter(
    (m) =>
      !selectedModels.some((s) => s._id === m._id) &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.provider.toLowerCase().includes(search.toLowerCase())),
  )

  const handleAdd = useCallback(
    (model: IModel) => {
      if (selectedModels.length >= MAX_MODELS) return
      onModelsChange([...selectedModels, model])
      setSearch('')
      setShowDropdown(false)
    },
    [selectedModels, onModelsChange],
  )

  const handleRemove = useCallback(
    (modelId: string) => {
      onModelsChange(selectedModels.filter((m) => m._id !== modelId))
    },
    [selectedModels, onModelsChange],
  )

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">모델 선택 (최대 {MAX_MODELS}개)</label>

      <div className="flex flex-wrap gap-2">
        {selectedModels.map((model) => (
          <Badge key={model._id} variant="secondary" className="gap-1 py-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: model.colorCode }}
            />
            {model.provider} / {model.name}
            <button onClick={() => handleRemove(model._id!)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {selectedModels.length < MAX_MODELS && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Plus className="mr-1 h-4 w-4" />
              모델 추가
            </Button>

            {showDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover p-2 shadow-md">
                <input
                  type="text"
                  placeholder="모델명 또는 프로바이더 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-2 w-full rounded-md border px-3 py-1.5 text-sm"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto">
                  {filtered.slice(0, 20).map((model) => (
                    <button
                      key={model._id}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => handleAdd(model)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: model.colorCode }}
                      />
                      <span className="text-muted-foreground">{model.provider}</span>
                      <span>{model.name}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      결과 없음
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Create ParameterPanel**

```typescript
// src/components/playground/parameter-panel.tsx
'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { IPlaygroundParameters } from '@/lib/types/playground'

interface ParameterPanelProps {
  readonly parameters: IPlaygroundParameters
  readonly onChange: (params: IPlaygroundParameters) => void
  readonly label?: string
}

export function ParameterPanel({ parameters, onChange, label }: ParameterPanelProps) {
  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Temperature</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={parameters.temperature}
            onChange={(e) =>
              onChange({ ...parameters, temperature: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Max Tokens</Label>
          <Input
            type="number"
            min={1}
            max={128000}
            step={256}
            value={parameters.maxTokens}
            onChange={(e) =>
              onChange({ ...parameters, maxTokens: parseInt(e.target.value) || 4096 })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Top P</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={parameters.topP}
            onChange={(e) =>
              onChange({ ...parameters, topP: parseFloat(e.target.value) || 1 })
            }
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Create PlaygroundSetup wrapper**

```typescript
// src/components/playground/playground-setup.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/playground/model-selector'
import { ParameterPanel } from '@/components/playground/parameter-panel'
import type { IModel } from '@/lib/types/model'
import type { IPlaygroundParameters } from '@/lib/types/playground'

interface PlaygroundSetupProps {
  readonly selectedModels: readonly IModel[]
  readonly onModelsChange: (models: readonly IModel[]) => void
  readonly systemPrompt: string
  readonly onSystemPromptChange: (prompt: string) => void
  readonly defaultParameters: IPlaygroundParameters
  readonly onDefaultParametersChange: (params: IPlaygroundParameters) => void
  readonly collapsed: boolean
  readonly onToggleCollapse: () => void
  readonly disabled: boolean
}

export function PlaygroundSetup({
  selectedModels,
  onModelsChange,
  systemPrompt,
  onSystemPromptChange,
  defaultParameters,
  onDefaultParametersChange,
  collapsed,
  onToggleCollapse,
  disabled,
}: PlaygroundSetupProps) {
  if (collapsed) {
    return (
      <div className="border-b px-4 py-2">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
        >
          <span>
            {selectedModels.map((m) => m.name).join(', ')} | 시스템 프롬프트:{' '}
            {systemPrompt ? systemPrompt.slice(0, 50) + '...' : '없음'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 border-b px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">세션 설정</h2>
        {disabled && (
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <ChevronUp className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ModelSelector
        selectedModels={selectedModels}
        onModelsChange={onModelsChange}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">시스템 프롬프트</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder="모든 모델에 공통으로 적용될 시스템 프롬프트를 입력하세요..."
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px] resize-y"
          disabled={disabled}
        />
      </div>

      <ParameterPanel
        parameters={defaultParameters}
        onChange={onDefaultParametersChange}
        label="기본 파라미터 (공통)"
      />
    </div>
  )
}
```

**Step 4: Verify visually**

Run: `npm run dev`, navigate to `/playground`.
Check: Model selector, system prompt, parameter inputs visible.

**Step 5: Commit**

```bash
git add src/components/playground/playground-setup.tsx
git add src/components/playground/model-selector.tsx
git add src/components/playground/parameter-panel.tsx
git commit -m "feat: add playground setup components (model selector, parameters)"
```

---

## Task 11: useStreamingChat Hook

**Owner:** frontend-dev
**Depends on:** Task 1
**Files:**
- Create: `src/hooks/use-streaming-chat.ts`
- Create: `src/__tests__/hooks/use-streaming-chat.test.ts`

**Step 1: Write the hook**

```typescript
// src/hooks/use-streaming-chat.ts
'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  IPlaygroundMessage,
  IPlaygroundMessageMetrics,
  IPlaygroundParameters,
} from '@/lib/types/playground'

interface StreamingState {
  readonly isStreaming: boolean
  readonly content: string
  readonly metrics: IPlaygroundMessageMetrics | null
  readonly error: string | null
}

interface UseStreamingChatOptions {
  readonly modelId: string
  readonly openRouterModelId: string
  readonly parameters: IPlaygroundParameters
  readonly pricing: { readonly input: number; readonly output: number }
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    metrics: null,
    error: null,
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (
      messages: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[],
    ): Promise<IPlaygroundMessage | null> => {
      setState({ isStreaming: true, content: '', metrics: null, error: null })
      abortControllerRef.current = new AbortController()

      const startTime = performance.now()
      let firstTokenTime: number | null = null
      let tokenCount = 0
      let fullContent = ''
      let usage: { promptTokens: number; completionTokens: number } | null = null

      try {
        const res = await fetch('/api/playground/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: '',
            modelId: options.modelId,
            openRouterModelId: options.openRouterModelId,
            messages,
            parameters: options.parameters,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!res.ok) {
          const errorText = await res.text()
          setState((prev) => ({ ...prev, isStreaming: false, error: errorText }))
          return null
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break

            try {
              const event = JSON.parse(data)

              if (event.type === 'token' && event.content) {
                if (firstTokenTime === null) {
                  firstTokenTime = performance.now()
                }
                tokenCount++
                fullContent += event.content
                setState((prev) => ({
                  ...prev,
                  content: prev.content + event.content,
                }))
              }

              if (event.type === 'done' && event.usage) {
                usage = event.usage
              }

              if (event.type === 'error') {
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  error: event.error,
                }))
                return null
              }
            } catch {
              // skip unparseable
            }
          }
        }

        const endTime = performance.now()
        const totalTime = endTime - startTime
        const ttft = firstTokenTime ? firstTokenTime - startTime : totalTime
        const tps = tokenCount > 0 ? tokenCount / (totalTime / 1000) : 0

        const inputTokens = usage?.promptTokens ?? 0
        const outputTokens = usage?.completionTokens ?? tokenCount
        const estimatedCost =
          (inputTokens * options.pricing.input +
            outputTokens * options.pricing.output) /
          1_000_000

        const metrics: IPlaygroundMessageMetrics = {
          ttft: Math.round(ttft),
          totalTime: Math.round(totalTime),
          tps: Math.round(tps * 10) / 10,
          inputTokens,
          outputTokens,
          estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000,
        }

        setState({ isStreaming: false, content: fullContent, metrics, error: null })

        return {
          role: 'assistant' as const,
          content: fullContent,
          modelId: options.modelId,
          metrics,
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setState((prev) => ({ ...prev, isStreaming: false }))
          return null
        }
        const message = error instanceof Error ? error.message : 'Stream failed'
        setState((prev) => ({ ...prev, isStreaming: false, error: message }))
        return null
      }
    },
    [options.modelId, options.openRouterModelId, options.parameters, options.pricing],
  )

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { ...state, sendMessage, stop }
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-streaming-chat.ts
git commit -m "feat: add useStreamingChat hook for SSE streaming"
```

---

## Task 12: ChatColumn + MessageBubble + MetricsBar

**Owner:** frontend-dev
**Depends on:** Task 11
**Files:**
- Create: `src/components/playground/chat-column.tsx`
- Create: `src/components/playground/message-bubble.tsx`
- Create: `src/components/playground/metrics-bar.tsx`

**Step 1: Create MetricsBar**

```typescript
// src/components/playground/metrics-bar.tsx
import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MetricsBarProps {
  readonly metrics: IPlaygroundMessageMetrics
  readonly isFastest?: {
    readonly ttft: boolean
    readonly tps: boolean
  }
}

export function MetricsBar({ metrics, isFastest }: MetricsBarProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 py-1 text-xs text-muted-foreground">
      <span className={isFastest?.ttft ? 'font-semibold text-green-600' : ''}>
        TTFT {metrics.ttft}ms
      </span>
      <span>
        총 {(metrics.totalTime / 1000).toFixed(1)}s
      </span>
      <span className={isFastest?.tps ? 'font-semibold text-green-600' : ''}>
        {metrics.tps} tps
      </span>
      <span>
        {metrics.inputTokens}+{metrics.outputTokens} tokens
      </span>
      <span>
        ${metrics.estimatedCost.toFixed(4)}
      </span>
    </div>
  )
}
```

**Step 2: Create MessageBubble**

```typescript
// src/components/playground/message-bubble.tsx
import { MetricsBar } from '@/components/playground/metrics-bar'
import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MessageBubbleProps {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly isStreaming?: boolean
  readonly metrics?: IPlaygroundMessageMetrics
  readonly isFastest?: { readonly ttft: boolean; readonly tps: boolean }
}

export function MessageBubble({
  role,
  content,
  isStreaming,
  metrics,
  isFastest,
}: MessageBubbleProps) {
  return (
    <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-full rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current" />
        )}
      </div>
      {metrics && <MetricsBar metrics={metrics} isFastest={isFastest} />}
    </div>
  )
}
```

**Step 3: Create ChatColumn**

```typescript
// src/components/playground/chat-column.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { Settings2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageBubble } from '@/components/playground/message-bubble'
import { ParameterPanel } from '@/components/playground/parameter-panel'
import type { IPlaygroundMessage, IPlaygroundParameters } from '@/lib/types/playground'

interface ChatColumnProps {
  readonly modelName: string
  readonly provider: string
  readonly colorCode: string
  readonly messages: readonly IPlaygroundMessage[]
  readonly streamingContent: string
  readonly isStreaming: boolean
  readonly error: string | null
  readonly parameters: IPlaygroundParameters
  readonly onParametersChange: (params: IPlaygroundParameters) => void
  readonly onStop: () => void
  readonly fastestMetrics?: {
    readonly ttft: string | null
    readonly tps: string | null
  }
}

export function ChatColumn({
  modelName,
  provider,
  colorCode,
  messages,
  streamingContent,
  isStreaming,
  error,
  parameters,
  onParametersChange,
  onStop,
  fastestMetrics,
}: ChatColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showParams, setShowParams] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  return (
    <div className="flex h-full flex-col rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colorCode }}
          />
          <div>
            <p className="text-sm font-medium">{modelName}</p>
            <p className="text-xs text-muted-foreground">{provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isStreaming && (
            <Button variant="ghost" size="sm" onClick={onStop}>
              <Square className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParams(!showParams)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showParams && (
        <div className="border-b p-3">
          <ParameterPanel parameters={parameters} onChange={onParametersChange} />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            metrics={msg.metrics}
            isFastest={
              msg.metrics
                ? {
                    ttft: fastestMetrics?.ttft === msg.modelId,
                    tps: fastestMetrics?.tps === msg.modelId,
                  }
                : undefined
            }
          />
        ))}

        {isStreaming && streamingContent && (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/playground/chat-column.tsx
git add src/components/playground/message-bubble.tsx
git add src/components/playground/metrics-bar.tsx
git commit -m "feat: add ChatColumn, MessageBubble, MetricsBar components"
```

---

## Task 13: ChatInput Component

**Owner:** frontend-dev
**Files:**
- Create: `src/components/playground/chat-input.tsx`

**Step 1: Create ChatInput**

```typescript
// src/components/playground/chat-input.tsx
'use client'

import { useState, useCallback } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  readonly onSend: (message: string) => void
  readonly disabled: boolean
  readonly placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }, [input, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div className="border-t px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '메시지를 입력하세요... (Shift+Enter로 줄바꿈)'}
          className="flex-1 resize-none rounded-md border px-3 py-2 text-sm min-h-[40px] max-h-[120px]"
          rows={1}
          disabled={disabled}
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          size="sm"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/playground/chat-input.tsx
git commit -m "feat: add ChatInput component"
```

---

## Task 14: Playground Page Integration

**Owner:** frontend-dev
**Depends on:** Tasks 9-13
**Files:**
- Modify: `src/app/playground/page.tsx` (full rewrite)

**Step 1: Integrate all components**

Rewrite `src/app/playground/page.tsx` to wire up:
- PlaygroundHeader (session management)
- PlaygroundSetup (model selection, system prompt, parameters)
- ChatArea with dynamic ChatColumns (1-3 based on selected models)
- ChatInput (common message input)
- useStreamingChat hooks (one per model, called in parallel on send)
- Session save logic (POST to create, PATCH to add messages after all streams complete)
- Session load logic (GET session by ID, populate state)
- Setup collapse logic (collapse after first message)

Key state management:
```typescript
const [selectedModels, setSelectedModels] = useState<IModel[]>([])
const [systemPrompt, setSystemPrompt] = useState('')
const [defaultParameters, setDefaultParameters] = useState(DEFAULT_PARAMETERS)
const [modelParameters, setModelParameters] = useState<Record<string, IPlaygroundParameters>>({})
const [messages, setMessages] = useState<IPlaygroundMessage[]>([])
const [sessionId, setSessionId] = useState<string | null>(null)
const [setupCollapsed, setSetupCollapsed] = useState(false)
```

Key flow on send:
1. Add user message to state
2. For each selected model, call sendMessage via useStreamingChat with model's chat history
3. All calls run in parallel (Promise.allSettled)
4. On each completion, add assistant message to state
5. After all complete, PATCH session with new messages
6. If no session yet, POST to create first, then PATCH

**Step 2: Verify end-to-end**

Run: `npm run dev`
1. Select 2-3 models
2. Enter system prompt
3. Type message and send
4. Verify: columns stream independently, metrics appear after completion
5. Send follow-up message, verify conversation continues

**Step 3: Commit**

```bash
git add src/app/playground/page.tsx
git commit -m "feat: integrate playground page with streaming chat"
```

---

## Task 15: Responsive Layout (Mobile Stack)

**Owner:** frontend-dev
**Depends on:** Task 14
**Files:**
- Modify: `src/app/playground/page.tsx` (ChatArea section)

**Step 1: Apply responsive classes**

The ChatArea grid should use:
```
className="grid gap-4 grid-cols-1 md:grid-cols-{n}"
```
where `n` is the number of selected models (1, 2, or 3).

On mobile (`<md`): columns stack vertically with each column having a min-height.
On desktop (`>=md`): columns display side-by-side.

**Step 2: Test on mobile viewport**

Open dev tools, toggle mobile viewport (375px).
Check: Columns stack vertically, scrollable, all functional.

**Step 3: Commit**

```bash
git add src/app/playground/page.tsx
git commit -m "feat: add responsive layout for mobile playground"
```

---

## Task 16: Research OpenRouter Model IDs

**Owner:** seed-mapper
**Depends on:** None
**Files:**
- Reference: `data/models.json` (read only)

**Step 1: Fetch OpenRouter model list**

Use OpenRouter API or docs to get the list of available model IDs:
```
https://openrouter.ai/api/v1/models
```

**Step 2: Create mapping document**

Match each of the 87 models in `data/models.json` to their OpenRouter model ID.
Example mappings:
```
GPT-4o        → openai/gpt-4o
Claude 3.5 Sonnet → anthropic/claude-3.5-sonnet
Gemini 2.0 Flash → google/gemini-2.0-flash-001
Qwen2.5-72B  → qwen/qwen-2.5-72b-instruct
```

Note: Some models may not be available on OpenRouter. These get `openRouterModelId: null`.

**Step 3: Document findings**

Save mapping to `data/openrouter-model-mapping.json` for reference:
```json
{
  "gpt-4o": "openai/gpt-4o",
  "claude-3-5-sonnet": "anthropic/claude-3.5-sonnet",
  ...
}
```

**Step 4: Commit**

```bash
git add data/openrouter-model-mapping.json
git commit -m "docs: add OpenRouter model ID mapping reference"
```

---

## Task 17: Update Seed Data with openRouterModelId

**Owner:** seed-mapper
**Depends on:** Task 16
**Files:**
- Modify: `data/models.json`

**Step 1: Add openRouterModelId to each model**

For each model in `data/models.json`, add the `openRouterModelId` field:
```json
{
  "name": "GPT-4o",
  "slug": "gpt-4o",
  "openRouterModelId": "openai/gpt-4o",
  ...
}
```

Models not available on OpenRouter get `"openRouterModelId": null`.

**Step 2: Update seed script**

Modify `scripts/seed.ts` to include `openRouterModelId` in the model parsing.
In the `parseModelData` function, add:
```typescript
openRouterModelId: raw.openRouterModelId || null,
```

**Step 3: Run seed locally to verify**

```bash
MONGODB_URI="mongodb://localhost:27017/atom-models" npx tsx scripts/seed.ts
```

**Step 4: Commit**

```bash
git add data/models.json scripts/seed.ts
git commit -m "feat: add openRouterModelId to seed data for 87 models"
```

---

## Task 18: Integration Testing

**Owner:** seed-mapper (or lead)
**Depends on:** Tasks 3, 17
**Files:**
- Modify: existing model tests if needed

**Step 1: Verify model API returns openRouterModelId**

```bash
curl http://localhost:3000/api/models?limit=5 | jq '.data[0].openRouterModelId'
```
Expected: returns the OpenRouter model ID string or null.

**Step 2: Verify playground model filter works**

```bash
curl http://localhost:3000/api/models?limit=200 | jq '[.data[] | select(.openRouterModelId != null)] | length'
```
Expected: returns count of models with openRouterModelId set.

**Step 3: Commit if any fixes needed**

```bash
git add -A
git commit -m "test: verify openRouterModelId integration"
```

---

## Execution Summary

| Phase | Tasks | Agents | Parallel? |
|-------|-------|--------|-----------|
| 0 | Task 1 (types) | lead | - |
| 1a | Tasks 2, 3, 6 | backend-dev | Yes (within agent) |
| 1b | Tasks 8, 9, 10, 11, 12, 13 | frontend-dev | Yes (within agent) |
| 1c | Tasks 16, 17 | seed-mapper | Yes (independent) |
| 2 | Tasks 4, 5, 7 | backend-dev | Sequential (dependencies) |
| 3 | Task 14, 15 | frontend-dev | Sequential |
| 4 | Task 18 | lead/seed-mapper | - |

**Total tasks:** 18
**Estimated commits:** 18
**Critical path:** Task 1 → Task 2 → Task 4 → Task 5/7 → Task 14 (integration)
