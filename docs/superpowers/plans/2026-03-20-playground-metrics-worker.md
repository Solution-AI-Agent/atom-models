# Playground Metrics Web Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-thread streaming with Web Workers so each model measures metrics independently, split reasoning/content metrics, fix server-side SSE bugs, and expand to 4 models.

**Architecture:** Each of up to 4 models gets a dedicated Web Worker thread. The Worker handles fetch + SSE parsing + timing measurement in isolation. The main thread only receives postMessage updates for rendering. Server-side SSE parsing bugs are fixed independently.

**Tech Stack:** Next.js 15, React, TypeScript, Web Workers (Webpack 5 `new URL` bundling), Jest, MongoDB/Mongoose

**Spec:** `docs/superpowers/specs/2026-03-20-playground-metrics-worker-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/types/worker-messages.ts` | Discriminated union types for Worker messages |
| `src/workers/stream.worker.ts` | SSE fetch, parse, timing measurement (runs in Worker thread) |
| `src/hooks/use-worker-chat.ts` | Worker lifecycle management + React state bridge |
| `src/lib/utils/create-stream-worker.ts` | Factory function for Worker creation (abstracts `import.meta.url` for testability) |
| `src/__tests__/lib/types/worker-messages.test.ts` | Type guard tests |
| `src/__tests__/workers/stream.worker.test.ts` | Worker logic unit tests |
| `src/__tests__/hooks/use-worker-chat.test.ts` | Hook integration tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/types/playground.ts` | `IPlaygroundMessageMetrics` new fields, `IPlaygroundChatStreamEvent` add `reasoningTokens` |
| `src/app/api/playground/chat/route.ts` | Fix 3 bugs: content/usage ordering, buffer flush, add `reasoningTokens` |
| `src/lib/db/models/playground-session.ts` | Schema: new metrics fields (reasoning/content split) |
| `src/components/playground/metrics-bar.tsx` | Display reasoning/content metrics separately |
| `src/components/playground/message-bubble.tsx` | Update `isFastest` prop types |
| `src/components/playground/chat-column.tsx` | Pass updated `isFastest` structure |
| `src/components/playground/model-selector.tsx` | `MAX_MODELS` 3 → 4 (done together with page.tsx in Task 7 to avoid intermediate broken state) |
| `src/app/playground/page.tsx` | Replace `useStreamingChat` with `useWorkerChat`, 4 hooks, grid 4-col, `fastestMetrics` update, migration logic |
| `src/__tests__/app/api/playground/chat/route.test.ts` | New tests for bug fixes |

---

### Task 1: Update Types (`playground.ts` + `worker-messages.ts`)

**Files:**
- Modify: `src/lib/types/playground.ts`
- Create: `src/lib/types/worker-messages.ts`
- Test: `src/__tests__/lib/types/worker-messages.test.ts`

- [ ] **Step 1: Write type guard tests for worker messages**

```typescript
// src/__tests__/lib/types/worker-messages.test.ts
/**
 * @jest-environment node
 */
import {
  isWorkerTokenMessage,
  isWorkerReasoningMessage,
  isWorkerDoneMessage,
  isWorkerErrorMessage,
} from '@/lib/types/worker-messages'

describe('Worker message type guards', () => {
  it('identifies token message', () => {
    expect(isWorkerTokenMessage({ type: 'token', content: 'hi' })).toBe(true)
    expect(isWorkerTokenMessage({ type: 'reasoning', content: 'hi' })).toBe(false)
  })

  it('identifies reasoning message', () => {
    expect(isWorkerReasoningMessage({ type: 'reasoning', content: 'think' })).toBe(true)
  })

  it('identifies done message', () => {
    const msg = {
      type: 'done',
      content: 'result',
      reasoning: '',
      metrics: {
        reasoningTtft: null,
        reasoningTps: null,
        reasoningTokens: 0,
        contentTtft: 100,
        contentTps: 50,
        contentTokens: 20,
        totalTime: 1000,
        inputTokens: 10,
        estimatedCost: 0.001,
      },
    }
    expect(isWorkerDoneMessage(msg)).toBe(true)
  })

  it('identifies error message', () => {
    expect(isWorkerErrorMessage({ type: 'error', error: 'fail' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/types/worker-messages.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Update `IPlaygroundMessageMetrics` in `playground.ts`**

Replace the existing `IPlaygroundMessageMetrics` interface (lines 1-8) with:

```typescript
export interface IPlaygroundMessageMetrics {
  readonly reasoningTtft: number | null
  readonly reasoningTps: number | null
  readonly reasoningTokens: number
  readonly contentTtft: number
  readonly contentTps: number
  readonly contentTokens: number
  readonly totalTime: number
  readonly inputTokens: number
  readonly estimatedCost: number
}
```

Update `IPlaygroundChatStreamEvent.usage` (line 80-84) to add `reasoningTokens`:

```typescript
readonly usage?: {
  readonly promptTokens: number
  readonly completionTokens: number
  readonly reasoningTokens?: number
}
```

- [ ] **Step 4: Create `worker-messages.ts` with types and guards**

```typescript
// src/lib/types/worker-messages.ts
import type { IPlaygroundMessageMetrics, IPlaygroundParameters } from './playground'

export type WorkerInboundMessage =
  | {
      readonly type: 'start'
      readonly apiBaseUrl: string
      readonly modelId: string
      readonly openRouterModelId: string
      readonly messages: readonly {
        readonly role: 'system' | 'user' | 'assistant'
        readonly content: string
      }[]
      readonly parameters: IPlaygroundParameters
      readonly pricing: {
        readonly inputPer1m: number | null
        readonly outputPer1m: number | null
      }
    }
  | { readonly type: 'abort' }

export type WorkerOutboundMessage =
  | { readonly type: 'reasoning'; readonly content: string }
  | { readonly type: 'token'; readonly content: string }
  | {
      readonly type: 'done'
      readonly content: string
      readonly reasoning: string
      readonly metrics: IPlaygroundMessageMetrics
    }
  | { readonly type: 'error'; readonly error: string }

export function isWorkerTokenMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'token' }> {
  return msg.type === 'token'
}

export function isWorkerReasoningMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'reasoning' }> {
  return msg.type === 'reasoning'
}

export function isWorkerDoneMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'done' }> {
  return msg.type === 'done'
}

export function isWorkerErrorMessage(
  msg: WorkerOutboundMessage,
): msg is Extract<WorkerOutboundMessage, { type: 'error' }> {
  return msg.type === 'error'
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/types/worker-messages.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/playground.ts src/lib/types/worker-messages.ts src/__tests__/lib/types/worker-messages.test.ts
git commit -m "feat: add split metrics types and worker message types"
```

---

### Task 2: Fix Server-Side SSE Bugs (`route.ts`)

**Files:**
- Modify: `src/app/api/playground/chat/route.ts`
- Modify: `src/__tests__/app/api/playground/chat/route.test.ts`

- [ ] **Step 1: Write tests for the 3 bug fixes**

Add to `src/__tests__/app/api/playground/chat/route.test.ts`:

```typescript
it('should not drop content when usage arrives in same chunk', async () => {
  const mockBody = new ReadableStream({
    start(controller) {
      // Chunk with both content AND usage
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"final"}}],"usage":{"prompt_tokens":10,"completion_tokens":5}}\n\n',
        ),
      )
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  mockedStream.mockResolvedValueOnce(
    new Response(mockBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
  )

  const request = new Request('http://localhost/api/playground/chat', {
    method: 'POST',
    body: JSON.stringify(makeValidBody()),
  })

  const response = await POST(request)
  const text = await response.text()
  const events = text
    .split('\n\n')
    .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
    .map((l) => JSON.parse(l.slice(6)))

  const tokenEvent = events.find((e: any) => e.type === 'token')
  const doneEvent = events.find((e: any) => e.type === 'done')
  expect(tokenEvent).toBeDefined()
  expect(tokenEvent.content).toBe('final')
  expect(doneEvent).toBeDefined()
  expect(doneEvent.usage.promptTokens).toBe(10)
})

it('should flush buffer when reader signals done', async () => {
  const mockBody = new ReadableStream({
    start(controller) {
      // Send data WITHOUT trailing newline so it stays in buffer
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"buffered"}}]}',
        ),
      )
      // Close without sending \n\n — data sits in buffer
      controller.close()
    },
  })
  mockedStream.mockResolvedValueOnce(
    new Response(mockBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
  )

  const request = new Request('http://localhost/api/playground/chat', {
    method: 'POST',
    body: JSON.stringify(makeValidBody()),
  })

  const response = await POST(request)
  const text = await response.text()
  const events = text
    .split('\n\n')
    .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
    .map((l) => JSON.parse(l.slice(6)))

  expect(events.some((e: any) => e.type === 'token' && e.content === 'buffered')).toBe(true)
})

it('should include reasoningTokens in done event', async () => {
  const mockBody = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(enc.encode('data: {"choices":[{"delta":{"reasoning":"think1"}}]}\n\n'))
      controller.enqueue(enc.encode('data: {"choices":[{"delta":{"reasoning":"think2"}}]}\n\n'))
      controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"answer"}}]}\n\n'))
      controller.enqueue(
        enc.encode(
          'data: {"choices":[],"usage":{"prompt_tokens":50,"completion_tokens":30}}\n\n',
        ),
      )
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  mockedStream.mockResolvedValueOnce(
    new Response(mockBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
  )

  const request = new Request('http://localhost/api/playground/chat', {
    method: 'POST',
    body: JSON.stringify(makeValidBody()),
  })

  const response = await POST(request)
  const text = await response.text()
  const events = text
    .split('\n\n')
    .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
    .map((l) => JSON.parse(l.slice(6)))

  const doneEvent = events.find((e: any) => e.type === 'done')
  expect(doneEvent).toBeDefined()
  expect(doneEvent.usage.reasoningTokens).toBe(2)
  expect(doneEvent.usage.completionTokens).toBe(30)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/__tests__/app/api/playground/chat/route.test.ts --no-coverage`
Expected: FAIL — content dropped, buffer not flushed, no reasoningTokens

- [ ] **Step 3: Fix `route.ts`**

Apply all 3 fixes to `src/app/api/playground/chat/route.ts`:

1. Extract `processSSELine` helper from the inline parsing logic (lines 119-150)
2. Fix content/usage ordering: remove `!usage` guards, process reasoning/content first, usage last
3. Add buffer flush on both `done` paths (reader done + SSE `[DONE]`)
4. Add `reasoningChunkCount` counter, include `reasoningTokens` in done event

The refactored stream `start()` body:

```typescript
async start(controller) {
  const encoder = new TextEncoder()
  let closed = false
  let buffer = ''
  let reasoningChunkCount = 0

  function closeStream() {
    if (!closed) {
      closed = true
      controller.close()
    }
  }

  function processSSELine(line: string) {
    if (!line.startsWith('data: ')) return
    const data = line.slice(6).trim()

    if (data === '[DONE]') {
      if (buffer.trim()) processSSELine(buffer)
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      closeStream()
      return
    }

    try {
      const parsed = JSON.parse(data)
      const delta = parsed.choices?.[0]?.delta
      const content = delta?.content || ''
      const reasoning = delta?.reasoning || ''
      const usage = parsed.usage || null

      if (reasoning) {
        reasoningChunkCount++
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', content: reasoning })}\n\n`),
        )
      }
      if (content) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`),
        )
      }
      if (usage) {
        const event = {
          type: 'done',
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            reasoningTokens: usage.reasoning_tokens ?? reasoningChunkCount,
          },
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        )
      }
    } catch {
      // skip unparseable lines
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        if (buffer.trim()) processSSELine(buffer)
        // Guard: processSSELine may have already closed the stream
        // (e.g., if buffer contained [DONE])
        if (!closed) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          closeStream()
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (closed) return
        processSSELine(line)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream error'
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`),
    )
    closeStream()
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/app/api/playground/chat/route.test.ts --no-coverage`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/playground/chat/route.ts src/__tests__/app/api/playground/chat/route.test.ts
git commit -m "fix: resolve 3 SSE parsing bugs in playground chat route"
```

---

### Task 3: Update DB Schema (`playground-session.ts`)

**Files:**
- Modify: `src/lib/db/models/playground-session.ts`
- Modify: `src/__tests__/lib/db/models/playground-session.test.ts`

- [ ] **Step 1: Write test for new schema fields**

Add to `src/__tests__/lib/db/models/playground-session.test.ts`:

```typescript
it('should have new split metrics fields in message schema', async () => {
  const { PlaygroundSessionModel } = await import(
    '@/lib/db/models/playground-session'
  )
  const schemaPaths = PlaygroundSessionModel.schema.paths
  expect(schemaPaths['messages.metrics.reasoningTtft']).toBeDefined()
  expect(schemaPaths['messages.metrics.reasoningTps']).toBeDefined()
  expect(schemaPaths['messages.metrics.reasoningTokens']).toBeDefined()
  expect(schemaPaths['messages.metrics.contentTtft']).toBeDefined()
  expect(schemaPaths['messages.metrics.contentTps']).toBeDefined()
  expect(schemaPaths['messages.metrics.contentTokens']).toBeDefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/lib/db/models/playground-session.test.ts --no-coverage`
Expected: FAIL — new fields not in schema

- [ ] **Step 3: Update the Mongoose schema**

In `src/lib/db/models/playground-session.ts`, update the `metrics` subdocument in the `messages` array (lines 63-70) to include both old and new fields (old fields retained for backward compatibility with existing documents):

```typescript
metrics: {
  // Legacy fields (kept for existing documents)
  ttft:            Number,
  totalTime:       Number,
  tps:             Number,
  inputTokens:     Number,
  outputTokens:    Number,
  estimatedCost:   Number,
  // New split fields
  reasoningTtft:   Number,
  reasoningTps:    Number,
  reasoningTokens: Number,
  contentTtft:     Number,
  contentTps:      Number,
  contentTokens:   Number,
},
```

Also update the `IPlaygroundSessionDocument` interface (lines 24-31) to include new fields:

```typescript
metrics?: {
  // Legacy
  ttft?: number
  totalTime?: number
  tps?: number
  inputTokens?: number
  outputTokens?: number
  estimatedCost?: number
  // New
  reasoningTtft?: number
  reasoningTps?: number
  reasoningTokens?: number
  contentTtft?: number
  contentTps?: number
  contentTokens?: number
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/lib/db/models/playground-session.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/models/playground-session.ts src/__tests__/lib/db/models/playground-session.test.ts
git commit -m "feat: add split metrics fields to playground session schema"
```

---

### Task 4: Implement Stream Worker (`stream.worker.ts`)

**Files:**
- Create: `src/workers/stream.worker.ts`
- Create: `src/__tests__/workers/stream.worker.test.ts`

- [ ] **Step 1: Write unit tests for the worker's core logic**

The worker file runs in a Worker context, so we test the extracted logic functions directly. Create `src/__tests__/workers/stream.worker.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import { parseSSELine, calculateMetrics } from '@/workers/stream.worker'

describe('parseSSELine', () => {
  it('returns null for non-data lines', () => {
    expect(parseSSELine('')).toBeNull()
    expect(parseSSELine('event: ping')).toBeNull()
  })

  it('returns DONE for [DONE] line', () => {
    expect(parseSSELine('data: [DONE]')).toEqual({ done: true })
  })

  it('parses token event', () => {
    const result = parseSSELine('data: {"type":"token","content":"hi"}')
    expect(result).toEqual({ type: 'token', content: 'hi' })
  })

  it('parses reasoning event', () => {
    const result = parseSSELine('data: {"type":"reasoning","content":"think"}')
    expect(result).toEqual({ type: 'reasoning', content: 'think' })
  })

  it('parses done event with usage', () => {
    const result = parseSSELine(
      'data: {"type":"done","usage":{"promptTokens":10,"completionTokens":20,"reasoningTokens":5}}',
    )
    expect(result).toEqual({
      type: 'done',
      usage: { promptTokens: 10, completionTokens: 20, reasoningTokens: 5 },
    })
  })

  it('returns null for unparseable JSON', () => {
    expect(parseSSELine('data: {broken')).toBeNull()
  })
})

describe('calculateMetrics', () => {
  it('calculates content-only metrics', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 2000,
      contentFirstTokenTime: 100,
      contentLastTokenTime: 1900,
      contentChunkCount: 10,
      reasoningFirstTokenTime: null,
      reasoningLastTokenTime: null,
      reasoningChunkCount: 0,
      usage: { promptTokens: 50, completionTokens: 20 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.reasoningTtft).toBeNull()
    expect(result.reasoningTps).toBeNull()
    expect(result.reasoningTokens).toBe(0)
    expect(result.contentTtft).toBe(100)
    expect(result.contentTokens).toBe(20)
    expect(result.totalTime).toBe(2000)
    expect(result.inputTokens).toBe(50)
    expect(result.contentTps).toBeGreaterThan(0)
    expect(result.estimatedCost).toBeGreaterThan(0)
  })

  it('calculates reasoning+content metrics', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 5000,
      contentFirstTokenTime: 2000,
      contentLastTokenTime: 4500,
      contentChunkCount: 15,
      reasoningFirstTokenTime: 80,
      reasoningLastTokenTime: 1900,
      reasoningChunkCount: 30,
      usage: { promptTokens: 100, completionTokens: 60, reasoningTokens: 40 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.reasoningTtft).toBe(80)
    expect(result.reasoningTps).toBeGreaterThan(0)
    expect(result.reasoningTokens).toBe(40)
    expect(result.contentTtft).toBe(2000)
    expect(result.contentTokens).toBe(20) // 60 - 40
  })

  it('clamps contentTokens to 0 when reasoning exceeds completion', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 1000,
      contentFirstTokenTime: 500,
      contentLastTokenTime: 900,
      contentChunkCount: 5,
      reasoningFirstTokenTime: 50,
      reasoningLastTokenTime: 400,
      reasoningChunkCount: 20,
      usage: { promptTokens: 10, completionTokens: 15, reasoningTokens: 20 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.contentTokens).toBe(0)
  })

  it('falls back to chunk count when usage has no reasoningTokens', () => {
    const result = calculateMetrics({
      startTime: 0,
      endTime: 1000,
      contentFirstTokenTime: 500,
      contentLastTokenTime: 900,
      contentChunkCount: 5,
      reasoningFirstTokenTime: 50,
      reasoningLastTokenTime: 400,
      reasoningChunkCount: 8,
      usage: { promptTokens: 10, completionTokens: 30 },
      pricing: { inputPer1m: 5, outputPer1m: 15 },
    })

    expect(result.reasoningTokens).toBe(8)
    expect(result.contentTokens).toBe(22) // 30 - 8
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/__tests__/workers/stream.worker.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `stream.worker.ts`**

Create `src/workers/stream.worker.ts`. Export `parseSSELine` and `calculateMetrics` as named exports for testability, plus the Worker `onmessage` handler.

Key implementation details:
- `parseSSELine(line: string)` — parses a single SSE line, returns parsed event or null
- `calculateMetrics(data)` — pure function that computes `IPlaygroundMessageMetrics` from timing/usage data
- `onmessage` handler — on `start`: creates AbortController, fetches `apiBaseUrl + '/api/playground/chat'`, reads stream, calls `parseSSELine` per line, tracks timing with `performance.now()`, posts `reasoning`/`token` chunks, calls `calculateMetrics` on done. On `abort`: calls `abortController.abort()`
- Buffer flush on both `done` paths (reader done + SSE `[DONE]`)
- Consecutive parse failure counter (reset on success, error after 10)
- TPS formula: `tokens / ((lastTokenTime - firstTokenTime) / 1000)` per phase

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/workers/stream.worker.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/workers/stream.worker.ts src/__tests__/workers/stream.worker.test.ts
git commit -m "feat: implement stream worker with independent metrics measurement"
```

---

### Task 5: Implement `useWorkerChat` Hook

**Files:**
- Create: `src/lib/utils/create-stream-worker.ts`
- Create: `src/hooks/use-worker-chat.ts`
- Create: `src/__tests__/hooks/use-worker-chat.test.ts`

**Important:** `import.meta.url` is not supported in Jest's CJS transform. To make the hook testable, abstract Worker creation into a factory function that can be mocked.

- [ ] **Step 0: Create `create-stream-worker.ts` factory**

```typescript
// src/lib/utils/create-stream-worker.ts
export function createStreamWorker(): Worker {
  return new Worker(
    new URL('../../workers/stream.worker.ts', import.meta.url),
  )
}
```

The hook will import `createStreamWorker` instead of calling `new Worker(new URL(...))` directly. This allows tests to mock the factory.

- [ ] **Step 1: Write hook integration tests**

Create `src/__tests__/hooks/use-worker-chat.test.ts`. Mock the factory function instead of the Worker constructor:

```typescript
/**
 * @jest-environment jsdom
 */

// Mock Worker class
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage = jest.fn()
  terminate = jest.fn()
}

let mockWorkerInstance: MockWorker

// Mock the factory — avoids import.meta.url issue entirely
jest.mock('@/lib/utils/create-stream-worker', () => ({
  createStreamWorker: () => {
    mockWorkerInstance = new MockWorker()
    return mockWorkerInstance
  },
}))

import { renderHook, act } from '@testing-library/react'
import { useWorkerChat } from '@/hooks/use-worker-chat'

const defaultOptions = {
  modelId: 'test-model',
  openRouterModelId: 'openai/gpt-4o',
  parameters: { temperature: 0.7, maxTokens: 4096, topP: 1, reasoningEffort: 'low' as const },
  pricing: { inputPer1m: 5, outputPer1m: 15 },
}

describe('useWorkerChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.content).toBe('')
    expect(result.current.reasoning).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('sends start message to worker on sendMessage', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'start', modelId: 'test-model' }),
    )
    expect(result.current.isStreaming).toBe(true)
  })

  it('accumulates content from token messages', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })

    act(() => {
      mockWorkerInstance.onmessage?.({ data: { type: 'token', content: 'hi ' } } as MessageEvent)
    })
    act(() => {
      mockWorkerInstance.onmessage?.({ data: { type: 'token', content: 'there' } } as MessageEvent)
    })

    expect(result.current.content).toBe('hi there')
  })

  it('resolves promise with result on done', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    let promise: Promise<any>
    act(() => {
      promise = result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })

    const doneMsg = {
      type: 'done',
      content: 'response',
      reasoning: '',
      metrics: {
        reasoningTtft: null, reasoningTps: null, reasoningTokens: 0,
        contentTtft: 100, contentTps: 50, contentTokens: 20,
        totalTime: 1000, inputTokens: 10, estimatedCost: 0.001,
      },
    }

    act(() => {
      mockWorkerInstance.onmessage?.({ data: doneMsg } as MessageEvent)
    })

    const resultMsg = await promise!
    expect(resultMsg).not.toBeNull()
    expect(resultMsg.content).toBe('response')
    expect(resultMsg.metrics.contentTtft).toBe(100)
  })

  it('sends abort on stop', () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })
    act(() => {
      result.current.stop()
    })

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'abort' })
  })

  it('does not show error UI for aborted', async () => {
    const { result } = renderHook(() => useWorkerChat(defaultOptions))

    act(() => {
      result.current.sendMessage([{ role: 'user', content: 'hello' }])
    })
    act(() => {
      mockWorkerInstance.onmessage?.({ data: { type: 'error', error: 'aborted' } } as MessageEvent)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.isStreaming).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/__tests__/hooks/use-worker-chat.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `use-worker-chat.ts`**

Create `src/hooks/use-worker-chat.ts`:

Key implementation details:
- Worker created in `useEffect` (SSR guard)
- `sendMessage()` returns a Promise that resolves on `done`/`error`
- `onmessage` handler dispatches by `msg.type`
- `stop()` posts `{ type: 'abort' }` to Worker
- `reset()` clears state, does NOT terminate Worker
- `unmount` calls `worker.terminate()`
- `isStreaming` guards against double `sendMessage`
- `apiBaseUrl` from `window.location.origin`

Interface matches existing `useStreamingChat`: `{ isStreaming, content, reasoning, metrics, error, sendMessage, stop, reset }`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/hooks/use-worker-chat.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/create-stream-worker.ts src/hooks/use-worker-chat.ts src/__tests__/hooks/use-worker-chat.test.ts
git commit -m "feat: implement useWorkerChat hook for worker-based streaming"
```

---

### Task 6: Update UI Components (`metrics-bar.tsx`, `message-bubble.tsx`)

**Files:**
- Modify: `src/components/playground/metrics-bar.tsx`
- Modify: `src/components/playground/message-bubble.tsx`

Note: `model-selector.tsx` MAX_MODELS change is in Task 7 to avoid intermediate broken state (4 models selectable but only 3 streams available).

- [ ] **Step 1: Update `metrics-bar.tsx` for split display**

Replace the entire component body. Display Reasoning block (if present), Content block, and Total block. Use purple left border for reasoning, blue for content. Apply green highlight on fastest `contentTtft` and `contentTps`.

```typescript
import type { IPlaygroundMessageMetrics } from '@/lib/types/playground'

interface MetricsBarProps {
  readonly metrics: IPlaygroundMessageMetrics
  readonly isFastest?: {
    readonly contentTtft: boolean
    readonly contentTps: boolean
  }
}

export function MetricsBar({ metrics, isFastest }: MetricsBarProps) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 px-2 py-1 text-xs text-muted-foreground">
      {metrics.reasoningTtft !== null && (
        <span className="border-l-2 border-purple-500 pl-1">
          R: {metrics.reasoningTtft}ms | {metrics.reasoningTps} tps | {metrics.reasoningTokens}t
        </span>
      )}
      <span
        className={`border-l-2 border-blue-500 pl-1 ${
          isFastest?.contentTtft || isFastest?.contentTps ? 'font-semibold text-green-600' : ''
        }`}
      >
        C: {metrics.contentTtft}ms
        {isFastest?.contentTtft && ' *'}
        {' | '}{metrics.contentTps} tps
        {isFastest?.contentTps && ' *'}
        {' | '}{metrics.contentTokens}t
      </span>
      <span>
        {(metrics.totalTime / 1000).toFixed(1)}s | {metrics.inputTokens}+
        {metrics.reasoningTokens + metrics.contentTokens}t | ${metrics.estimatedCost.toFixed(4)}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Update `message-bubble.tsx` `isFastest` prop**

Change `isFastest` type from `{ ttft: boolean; tps: boolean }` to `{ contentTtft: boolean; contentTps: boolean }` (lines 15 and the JSX passing to MetricsBar):

```typescript
readonly isFastest?: { readonly contentTtft: boolean; readonly contentTps: boolean }
```

And in JSX (line 84):

```typescript
{metrics && <MetricsBar metrics={metrics} isFastest={isFastest} />}
```

(No change to JSX — the prop name passthrough stays the same, only the type changes.)

- [ ] **Step 3: Run build check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors in modified files (may have pre-existing errors elsewhere)

- [ ] **Step 4: Commit**

```bash
git add src/components/playground/metrics-bar.tsx src/components/playground/message-bubble.tsx
git commit -m "feat: update playground UI for split metrics display"
```

---

### Task 7: Update `page.tsx` (Wire Everything Together)

**Files:**
- Modify: `src/app/playground/page.tsx`
- Modify: `src/components/playground/chat-column.tsx`
- Modify: `src/components/playground/model-selector.tsx` (MAX_MODELS 3 → 4, must be in same commit as page.tsx stream3 addition)

- [ ] **Step 1: Update `chat-column.tsx` `fastestMetrics` prop type**

Change `fastestMetrics` prop type (lines 22-25) from `{ ttft: string | null; tps: string | null }` to `{ contentTtft: string | null; contentTps: string | null }`.

Update the `isFastest` computation in JSX (lines 100-107) to use new field names:

```typescript
isFastest={
  msg.metrics
    ? {
        contentTtft: fastestMetrics?.contentTtft === msg.modelId,
        contentTps: fastestMetrics?.contentTps === msg.modelId,
      }
    : undefined
}
```

- [ ] **Step 2: Rewrite `page.tsx`**

Apply all changes to `src/app/playground/page.tsx`:

1. Replace `import { useStreamingChat }` with `import { useWorkerChat }` from `@/hooks/use-worker-chat`
2. Change 3 hook calls to 4 `useWorkerChat` calls:

```typescript
const stream0 = useWorkerChat(makeStreamOptions(selectedModels[0], paramsFor(selectedModels[0])))
const stream1 = useWorkerChat(makeStreamOptions(selectedModels[1], paramsFor(selectedModels[1])))
const stream2 = useWorkerChat(makeStreamOptions(selectedModels[2], paramsFor(selectedModels[2])))
const stream3 = useWorkerChat(makeStreamOptions(selectedModels[3], paramsFor(selectedModels[3])))
const streams = [stream0, stream1, stream2, stream3]
```

3. Update `fastestMetrics` useMemo — change `msg.metrics!.ttft` → `msg.metrics!.contentTtft`, `msg.metrics!.tps` → `msg.metrics!.contentTps`. Change return type to `{ contentTtft, contentTps }`.

4. Update `gridColsClass`:

```typescript
const gridColsClass =
  selectedModels.length === 4
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    : selectedModels.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : selectedModels.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1'
```

5. Change `model-selector.tsx` line 9: `const MAX_MODELS = 3` → `const MAX_MODELS = 4`

6. Add `migrateMetrics` as a **module-level** function (outside the component, near `makeStreamOptions`) and apply in `handleSelectSession`:

```typescript
function migrateMetrics(metrics: any): IPlaygroundMessageMetrics {
  if (metrics?.ttft !== undefined && metrics?.contentTtft === undefined) {
    return {
      reasoningTtft: null,
      reasoningTps: null,
      reasoningTokens: 0,
      contentTtft: metrics.ttft ?? 0,
      contentTps: metrics.tps ?? 0,
      contentTokens: metrics.outputTokens ?? 0,
      totalTime: metrics.totalTime ?? 0,
      inputTokens: metrics.inputTokens ?? 0,
      estimatedCost: metrics.estimatedCost ?? 0,
    }
  }
  return metrics
}
```

Apply in `handleSelectSession` when setting messages:

```typescript
setMessages(
  (session.messages || []).map((m: any) => ({
    ...m,
    metrics: m.metrics ? migrateMetrics(m.metrics) : undefined,
  })),
)
```

- [ ] **Step 3: Run build check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -50`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/playground/page.tsx src/components/playground/chat-column.tsx src/components/playground/model-selector.tsx
git commit -m "feat: wire useWorkerChat, 4-model grid, and metrics migration"
```

---

### Task 8: Clean Up Old Code

**Files:**
- Delete or keep: `src/hooks/use-streaming-chat.ts`

- [ ] **Step 1: Verify no remaining imports of `useStreamingChat`**

Run: `grep -r "use-streaming-chat\|useStreamingChat" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches (all replaced by `useWorkerChat`)

- [ ] **Step 2: Delete `use-streaming-chat.ts` if unused**

```bash
rm src/hooks/use-streaming-chat.ts
```

- [ ] **Step 3: Run full test suite**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: All tests pass. Some pre-existing tests may need minor updates if they import `IPlaygroundMessageMetrics` — fix any that reference the old field names (`ttft`, `tps`, `outputTokens`).

- [ ] **Step 4: Run build**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old useStreamingChat hook"
```

---

### Task 9: Manual Smoke Test

- [ ] **Step 1: Start dev server and test with 2 models**

Run: `npm run dev`

1. Open playground
2. Select 2 models
3. Send a message
4. Verify both responses stream independently
5. Verify MetricsBar shows split Reasoning/Content metrics (if applicable)
6. Verify TTFT and TPS values look reasonable

- [ ] **Step 2: Test with 4 models**

1. Select 4 models
2. Send a message
3. Verify 4-column grid layout
4. Verify all 4 stream independently
5. Verify fastest metrics highlighted in green

- [ ] **Step 3: Test session persistence**

1. Send messages, verify metrics saved
2. Refresh page, load session
3. Verify metrics display correctly (including migration from old format if applicable)

- [ ] **Step 4: Test abort**

1. Start streaming
2. Click stop on one model
3. Verify only that model stops, others continue

---

## Dependency Order

```
Task 1 (Types) ──┬──▶ Task 4 (Worker) ──▶ Task 5 (Hook) ──┐
                 │                                         ├──▶ Task 7 (Page+Selector) ──▶ Task 8 (Cleanup) ──▶ Task 9 (Smoke)
Task 2 (Server) ─┤                                         │
                 │                                         │
Task 3 (Schema) ─┤       Task 6 (UI Components) ──────────┘
                 │
                 └──▶ Task 6 (UI Components)
```

Tasks 1, 2, 3 can run in parallel. Task 4 depends on 1. Task 5 depends on 4. Task 6 depends on 1. Task 7 depends on 2, 3, 5, and 6. Task 8 depends on 7. Task 9 depends on 8.

**Note on E2E tests:** The spec requires Playwright E2E tests (4 scenarios) and a Worker isolation timing test. These are deferred to a follow-up task after the implementation is validated via manual smoke test (Task 9). E2E tests require a running dev server with mock OpenRouter responses, which is a separate infrastructure concern.
