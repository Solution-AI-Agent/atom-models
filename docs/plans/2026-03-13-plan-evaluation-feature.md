# Evaluation Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phoenix-integrated LLM evaluation — upload Excel Q&A, generate model responses via OpenRouter, evaluate with Phoenix LLM-as-Judge, display results.

**Architecture:** Direct integration — atom-models API routes call Phoenix REST API via `@arizeai/phoenix-client` + `@arizeai/phoenix-evals`. No separate services. Existing OpenRouter gateway reused for model response generation.

**Tech Stack:** `@arizeai/phoenix-client`, `@arizeai/phoenix-evals`, `@ai-sdk/openai`, `xlsx`, Zod, Recharts, shadcn/ui

**Spec:** `docs/specs/2026-03-13-spec-evaluation-feature.md`

---

## File Structure

### New Files

| Path | Responsibility |
|------|---------------|
| `src/lib/types/evaluation.ts` | TypeScript interfaces for evaluation feature |
| `src/lib/db/models/evaluation-session.ts` | Mongoose schema for evaluation_sessions collection |
| `src/lib/services/phoenix.service.ts` | Phoenix client init, dataset creation, experiment execution |
| `src/lib/services/evaluation.service.ts` | Orchestration: parse → create → run → save → query |
| `src/app/api/evaluation/upload/route.ts` | Excel upload + parse endpoint |
| `src/app/api/evaluation/run/route.ts` | Evaluation execution endpoint |
| `src/app/api/evaluation/sessions/route.ts` | List sessions endpoint |
| `src/app/api/evaluation/sessions/[id]/route.ts` | Session detail endpoint |
| `src/app/api/evaluation/sessions/[id]/status/route.ts` | Status polling endpoint |
| `src/app/evaluation/page.tsx` | Setup & Upload page |
| `src/app/evaluation/result/[id]/page.tsx` | Result Dashboard page |
| `src/app/evaluation/history/page.tsx` | Session History page |
| `src/components/evaluation/evaluation-setup.tsx` | Setup form layout |
| `src/components/evaluation/file-upload-zone.tsx` | Drag & drop file upload |
| `src/components/evaluation/data-preview-table.tsx` | Uploaded data preview |
| `src/components/evaluation/evaluator-selector.tsx` | Evaluator checkbox list |
| `src/components/evaluation/evaluation-progress.tsx` | Running progress display |
| `src/components/evaluation/score-summary-card.tsx` | Per-model score card |
| `src/components/evaluation/score-comparison-chart.tsx` | Recharts bar chart |
| `src/components/evaluation/evaluation-result-table.tsx` | Individual Q&A results |
| `src/components/evaluation/session-list.tsx` | History session list |
| `src/components/evaluation/session-status-badge.tsx` | Status badge |

### Modified Files

| Path | Change |
|------|--------|
| `src/lib/services/openrouter.service.ts` | Add `completeChatCompletion()` non-streaming function |
| `src/components/app-sidebar.tsx` | Add Evaluation nav item |
| `package.json` | Add 5 new dependencies |

### Test Files

| Path | Tests |
|------|-------|
| `src/__tests__/services/openrouter.service.test.ts` | completeChatCompletion unit tests |
| `src/__tests__/services/evaluation.service.test.ts` | Orchestration logic tests |
| `src/__tests__/services/phoenix.service.test.ts` | Phoenix integration tests (mocked) |
| `src/__tests__/api/evaluation/upload.test.ts` | Upload route tests |
| `src/__tests__/api/evaluation/run.test.ts` | Run route tests |
| `src/__tests__/api/evaluation/sessions.test.ts` | Sessions route tests |

---

## Chunk 1: Foundation — Dependencies, Types, Schema

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
npm install @arizeai/phoenix-client @arizeai/phoenix-evals @ai-sdk/openai ai xlsx
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@arizeai/phoenix-client'); require('xlsx'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Add env vars to .env.example (if exists) or .env.local**

Add to `.env.local`:
```
PHOENIX_HOST=http://localhost:6006
PHOENIX_API_KEY=
EVAL_JUDGE_MODEL=openai/gpt-4o-mini
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local
git commit -m "chore: add Phoenix and xlsx dependencies for evaluation feature"
```

---

### Task 2: Type definitions

**Files:**
- Create: `src/lib/types/evaluation.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/lib/types/evaluation.ts

export interface IEvaluationModelConfig {
  readonly modelId: string
  readonly slug: string
  readonly openRouterModelId: string
  readonly modelName: string
  readonly provider: string
  readonly parameters: {
    readonly temperature: number
    readonly maxTokens: number
  }
}

export type EvaluatorName = 'correctness' | 'relevance' | 'hallucination'

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface IEvaluationConfig {
  readonly models: readonly IEvaluationModelConfig[]
  readonly evaluators: readonly EvaluatorName[]
  readonly systemPrompt?: string
  readonly phoenixDatasetId?: string
}

export interface IEvaluationDatasetInfo {
  readonly fileName: string
  readonly rowCount: number
  readonly columns: readonly string[]
}

export interface IEvaluationScore {
  readonly score: number
  readonly label: string
  readonly explanation: string
}

export interface IEvaluationRowResult {
  readonly rowIndex: number
  readonly question: string
  readonly groundTruth: string
  readonly modelResponse: string
  readonly evaluations: Partial<Record<EvaluatorName, IEvaluationScore>>
  readonly latencyMs: number
  readonly tokenCount: {
    readonly input: number
    readonly output: number
  }
}

export interface IExperimentMetrics {
  readonly avgLatencyMs: number
  readonly totalTokens: {
    readonly input: number
    readonly output: number
  }
  readonly estimatedCost: number
}

export interface IExperimentResult {
  readonly modelSlug: string
  readonly phoenixExperimentId: string
  readonly status: EvaluationStatus
  readonly scores: Partial<Record<EvaluatorName, number>>
  readonly results: readonly IEvaluationRowResult[]
  readonly metrics: IExperimentMetrics
}

export interface IEvaluationSession {
  readonly _id?: string
  readonly name: string
  readonly status: EvaluationStatus
  readonly config: IEvaluationConfig
  readonly dataset: IEvaluationDatasetInfo
  readonly experiments: readonly IExperimentResult[]
  readonly createdAt?: string
  readonly startedAt?: string
  readonly completedAt?: string
}

export interface IEvaluationSessionSummary {
  readonly _id: string
  readonly name: string
  readonly status: EvaluationStatus
  readonly dataset: IEvaluationDatasetInfo
  readonly modelCount: number
  readonly createdAt: string
}

export interface IEvaluationUploadResponse {
  readonly columns: readonly string[]
  readonly rowCount: number
  readonly preview: readonly Record<string, string>[]
  readonly rows: readonly Record<string, string>[]
}

export interface IEvaluationRunRequest {
  readonly name: string
  readonly rows: readonly Record<string, string>[]
  readonly fileName: string
  readonly columns: readonly string[]
  readonly models: readonly IEvaluationModelConfig[]
  readonly evaluators: readonly EvaluatorName[]
  readonly systemPrompt?: string
  readonly parameters?: {
    readonly temperature?: number
    readonly maxTokens?: number
  }
}

export interface IEvaluationProgress {
  readonly status: EvaluationStatus
  readonly progress: {
    readonly completed: number
    readonly total: number
  }
  readonly experiments: readonly {
    readonly modelSlug: string
    readonly status: EvaluationStatus
  }[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit src/lib/types/evaluation.ts 2>&1 | head -20
```

Expected: No errors (or only unrelated errors)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/evaluation.ts
git commit -m "feat: add evaluation feature type definitions"
```

---

### Task 3: Mongoose schema

**Files:**
- Create: `src/lib/db/models/evaluation-session.ts`

- [ ] **Step 1: Create Mongoose schema**

Follow the pattern from `playground-session.ts`: interface + schema + model export.

```typescript
// src/lib/db/models/evaluation-session.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IEvaluationSessionDocument extends Document {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  config: {
    models: {
      modelId: mongoose.Types.ObjectId
      slug: string
      openRouterModelId: string
      modelName: string
      provider: string
      parameters: {
        temperature: number
        maxTokens: number
      }
    }[]
    evaluators: string[]
    systemPrompt?: string
    phoenixDatasetId?: string
  }
  dataset: {
    fileName: string
    rowCount: number
    columns: string[]
  }
  experiments: {
    modelSlug: string
    phoenixExperimentId: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    scores: Record<string, number | undefined>
    results: {
      rowIndex: number
      question: string
      groundTruth: string
      modelResponse: string
      evaluations: Record<string, {
        score: number
        label: string
        explanation: string
      } | undefined>
      latencyMs: number
      tokenCount: { input: number; output: number }
    }[]
    metrics: {
      avgLatencyMs: number
      totalTokens: { input: number; output: number }
      estimatedCost: number
    }
  }[]
  startedAt?: Date
  completedAt?: Date
}

const EvaluationSessionSchema = new Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
  },
  config: {
    models: [{
      modelId:           { type: Schema.Types.ObjectId, ref: 'Model', required: true },
      slug:              { type: String, required: true },
      openRouterModelId: { type: String, required: true },
      modelName:         { type: String, required: true },
      provider:          { type: String, required: true },
      parameters: {
        temperature: { type: Number, default: 0 },
        maxTokens:   { type: Number, default: 1024 },
      },
    }],
    evaluators:      [{ type: String }],
    systemPrompt:    { type: String },
    phoenixDatasetId: { type: String },
  },
  dataset: {
    fileName:  { type: String, required: true },
    rowCount:  { type: Number, required: true },
    columns:   [{ type: String }],
  },
  experiments: [{
    modelSlug:            { type: String, required: true },
    phoenixExperimentId:  { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    scores:  { type: Schema.Types.Mixed, default: {} },
    results: [{
      rowIndex:      Number,
      question:      String,
      groundTruth:   String,
      modelResponse: String,
      evaluations:   { type: Schema.Types.Mixed, default: {} },
      latencyMs:     Number,
      tokenCount: {
        input:  Number,
        output: Number,
      },
    }],
    metrics: {
      avgLatencyMs: Number,
      totalTokens: {
        input:  Number,
        output: Number,
      },
      estimatedCost: Number,
    },
  }],
  startedAt:   Date,
  completedAt: Date,
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
})

EvaluationSessionSchema.index({ createdAt: -1 })
EvaluationSessionSchema.index({ status: 1 })

export const EvaluationSessionModel: Model<IEvaluationSessionDocument> =
  mongoose.models.EvaluationSession ||
  mongoose.model<IEvaluationSessionDocument>('EvaluationSession', EvaluationSessionSchema)
```

- [ ] **Step 2: Verify import works**

```bash
npx tsc --noEmit src/lib/db/models/evaluation-session.ts 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/models/evaluation-session.ts
git commit -m "feat: add EvaluationSession Mongoose schema"
```

---

### Task 4: Non-streaming OpenRouter function

**Files:**
- Modify: `src/lib/services/openrouter.service.ts`
- Create: `src/__tests__/services/openrouter.service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/services/openrouter.service.test.ts
import { completeChatCompletion } from '@/lib/services/openrouter.service'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
  process.env.OPENROUTER_API_KEY = 'test-key'
})

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY
})

describe('completeChatCompletion', () => {
  it('returns content and usage from successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Paris is the capital of France.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 8 },
      }),
    })

    const result = await completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'What is the capital of France?' }],
    })

    expect(result.content).toBe('Paris is the capital of France.')
    expect(result.usage.promptTokens).toBe(10)
    expect(result.usage.completionTokens).toBe(8)
  })

  it('throws on missing API key', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
    })).rejects.toThrow('OPENROUTER_API_KEY')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    })

    await expect(completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
    })).rejects.toThrow('429')
  })

  it('sends correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 5, completion_tokens: 1 },
      }),
    })

    await completeChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      temperature: 0,
      maxTokens: 512,
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.stream).toBe(false)
    expect(callBody.temperature).toBe(0)
    expect(callBody.max_tokens).toBe(512)
    expect(callBody.stream_options).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/services/openrouter.service.test.ts --no-cache 2>&1 | tail -5
```

Expected: FAIL — `completeChatCompletion` is not exported

- [ ] **Step 3: Implement completeChatCompletion**

Add to `src/lib/services/openrouter.service.ts` after the existing `streamChatCompletion` function:

```typescript
interface CompleteChatOptions {
  readonly model: string
  readonly messages: readonly ChatMessage[]
  readonly temperature?: number
  readonly maxTokens?: number
}

interface CompleteChatResult {
  readonly content: string
  readonly usage: {
    readonly promptTokens: number
    readonly completionTokens: number
  }
}

export async function completeChatCompletion(
  options: CompleteChatOptions,
): Promise<CompleteChatResult> {
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
      temperature: options.temperature ?? 0,
      max_tokens: options.maxTokens ?? 1024,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 }

  return {
    content,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/services/openrouter.service.test.ts --no-cache 2>&1 | tail -5
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/openrouter.service.ts src/__tests__/services/openrouter.service.test.ts
git commit -m "feat: add completeChatCompletion for non-streaming OpenRouter calls"
```

---

## Chunk 2: Services — Phoenix and Evaluation

### Task 5: Phoenix service

**Files:**
- Create: `src/lib/services/phoenix.service.ts`
- Create: `src/__tests__/services/phoenix.service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/services/phoenix.service.test.ts
jest.mock('@arizeai/phoenix-client', () => ({
  createClient: jest.fn(() => ({
    GET: jest.fn().mockResolvedValue({ data: [] }),
  })),
}))

jest.mock('@arizeai/phoenix-client/datasets', () => ({
  createDataset: jest.fn().mockResolvedValue({ datasetId: 'ds-123' }),
}))

jest.mock('@arizeai/phoenix-client/experiments', () => ({
  runExperiment: jest.fn().mockResolvedValue({
    runs: [{ output: 'test response', startTime: 0, endTime: 100 }],
    evaluations: { correctness: [{ score: 1, label: 'correct', explanation: 'ok' }] },
  }),
  asExperimentEvaluator: jest.fn((e) => e),
}))

jest.mock('@arizeai/phoenix-evals/llm', () => ({
  createCorrectnessEvaluator: jest.fn(() => jest.fn().mockResolvedValue({ score: 1, label: 'correct', explanation: 'ok' })),
  createHallucinationEvaluator: jest.fn(() => jest.fn().mockResolvedValue({ score: 1, label: 'factual', explanation: 'ok' })),
  createDocumentRelevanceEvaluator: jest.fn(() => jest.fn().mockResolvedValue({ score: 1, label: 'relevant', explanation: 'ok' })),
}))

import { createPhoenixDataset, checkPhoenixHealth } from '@/lib/services/phoenix.service'

beforeEach(() => {
  process.env.PHOENIX_HOST = 'http://localhost:6006'
})

describe('checkPhoenixHealth', () => {
  it('returns true when Phoenix is reachable', async () => {
    const result = await checkPhoenixHealth()
    expect(result).toBe(true)
  })
})

describe('createPhoenixDataset', () => {
  it('creates dataset and returns datasetId', async () => {
    const result = await createPhoenixDataset({
      name: 'test-dataset',
      rows: [
        { question: 'What is 1+1?', ground_truth: '2' },
      ],
    })
    expect(result.datasetId).toBe('ds-123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/services/phoenix.service.test.ts --no-cache 2>&1 | tail -5
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement Phoenix service**

```typescript
// src/lib/services/phoenix.service.ts
import { createClient } from '@arizeai/phoenix-client'
import { createDataset } from '@arizeai/phoenix-client/datasets'
import { runExperiment, asExperimentEvaluator } from '@arizeai/phoenix-client/experiments'
import { createOpenAI } from '@ai-sdk/openai'
import type { EvaluatorName } from '@/lib/types/evaluation'

function getPhoenixClient() {
  const baseUrl = process.env.PHOENIX_HOST
  if (!baseUrl) {
    throw new Error('PHOENIX_HOST environment variable is not set')
  }
  return createClient({
    options: {
      baseUrl,
      ...(process.env.PHOENIX_API_KEY && {
        headers: { Authorization: `Bearer ${process.env.PHOENIX_API_KEY}` },
      }),
    },
  })
}

export async function checkPhoenixHealth(): Promise<boolean> {
  try {
    const client = getPhoenixClient()
    await client.GET('/v1/datasets')
    return true
  } catch {
    return false
  }
}

export async function createPhoenixDataset(options: {
  readonly name: string
  readonly rows: readonly Record<string, string>[]
}): Promise<{ datasetId: string }> {
  const { datasetId } = await createDataset({
    name: options.name,
    description: `Evaluation dataset - ${options.rows.length} rows`,
    examples: options.rows.map((row) => ({
      input: { question: row.question, context: row.context },
      output: { answer: row.ground_truth },
      metadata: {},
    })),
  })
  return { datasetId }
}

function getJudgeModel() {
  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  })
  return openrouter(process.env.EVAL_JUDGE_MODEL ?? 'openai/gpt-4o-mini')
}

export async function buildEvaluators(evaluatorNames: readonly EvaluatorName[]) {
  // Dynamic import to avoid issues with ESM/CJS in Next.js
  const {
    createCorrectnessEvaluator,
    createHallucinationEvaluator,
    createDocumentRelevanceEvaluator,
  } = await import('@arizeai/phoenix-evals/llm')

  const model = getJudgeModel()
  const evaluators = []

  // Construct each evaluator ONCE (not per row)
  for (const name of evaluatorNames) {
    if (name === 'correctness') {
      const evalFn = createCorrectnessEvaluator({ model })
      evaluators.push(asExperimentEvaluator({
        name: 'correctness',
        kind: 'LLM',
        evaluate: async ({ output, expected }) => evalFn({ output, expected }),
      }))
    }
    if (name === 'hallucination') {
      const evalFn = createHallucinationEvaluator({ model })
      evaluators.push(asExperimentEvaluator({
        name: 'hallucination',
        kind: 'LLM',
        evaluate: async ({ output, expected }) => evalFn({ output, expected }),
      }))
    }
    if (name === 'relevance') {
      const evalFn = createDocumentRelevanceEvaluator({ model })
      evaluators.push(asExperimentEvaluator({
        name: 'relevance',
        kind: 'LLM',
        evaluate: async ({ input, output }) => evalFn({ input, output }),
      }))
    }
  }

  return evaluators
}

export async function runPhoenixExperiment(options: {
  readonly datasetId: string
  readonly experimentName: string
  readonly task: (example: { input: Record<string, unknown> }) => Promise<string>
  readonly evaluators: Awaited<ReturnType<typeof buildEvaluators>>
}) {
  const experiment = await runExperiment({
    dataset: { datasetId: options.datasetId },
    task: options.task,
    evaluators: options.evaluators,
  })
  return experiment
}
```

**Note:** The exact evaluator API may need adjustment during implementation based on the actual `@arizeai/phoenix-evals` package exports. The spec uses pre-built evaluators — check the package's TypeDoc at build time and adjust imports accordingly. The pattern above shows the integration approach; adapt function names to match the actual exports.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/services/phoenix.service.test.ts --no-cache 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/phoenix.service.ts src/__tests__/services/phoenix.service.test.ts
git commit -m "feat: add Phoenix service for dataset creation and experiment execution"
```

---

### Task 6: Evaluation service (orchestration)

**Files:**
- Create: `src/lib/services/evaluation.service.ts`
- Create: `src/__tests__/services/evaluation.service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/services/evaluation.service.test.ts
jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn(),
}))
jest.mock('@/lib/db/models/evaluation-session', () => ({
  EvaluationSessionModel: {
    create: jest.fn().mockResolvedValue({ _id: 'session-123', toJSON: () => ({ _id: 'session-123' }) }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}))

import {
  createEvaluationSession,
  getEvaluationSessions,
  getEvaluationSessionById,
} from '@/lib/services/evaluation.service'

describe('createEvaluationSession', () => {
  it('creates a session with pending status', async () => {
    const session = await createEvaluationSession({
      name: 'Test Eval',
      config: {
        models: [],
        evaluators: ['correctness'],
      },
      dataset: {
        fileName: 'test.xlsx',
        rowCount: 10,
        columns: ['question', 'ground_truth'],
      },
    })
    expect(session._id).toBe('session-123')
  })
})

describe('getEvaluationSessions', () => {
  it('returns sessions sorted by createdAt desc', async () => {
    const sessions = await getEvaluationSessions()
    expect(Array.isArray(sessions)).toBe(true)
  })
})

describe('getEvaluationSessionById', () => {
  it('returns null for unknown id', async () => {
    const session = await getEvaluationSessionById('unknown')
    expect(session).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/services/evaluation.service.test.ts --no-cache 2>&1 | tail -5
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement evaluation service**

```typescript
// src/lib/services/evaluation.service.ts
import { getConnection } from '@/lib/db/connection'
import { EvaluationSessionModel } from '@/lib/db/models/evaluation-session'
import type {
  IEvaluationSession,
  IEvaluationSessionSummary,
  IEvaluationProgress,
  EvaluatorName,
} from '@/lib/types/evaluation'
import { serialize } from '@/lib/utils/serialize'

export async function createEvaluationSession(data: {
  readonly name: string
  readonly config: {
    readonly models: readonly {
      readonly modelId: string
      readonly slug: string
      readonly openRouterModelId: string
      readonly modelName: string
      readonly provider: string
      readonly parameters: { readonly temperature: number; readonly maxTokens: number }
    }[]
    readonly evaluators: readonly EvaluatorName[]
    readonly systemPrompt?: string
  }
  readonly dataset: {
    readonly fileName: string
    readonly rowCount: number
    readonly columns: readonly string[]
  }
}) {
  await getConnection()
  const session = await EvaluationSessionModel.create({
    name: data.name,
    status: 'pending',
    config: {
      models: data.config.models,
      evaluators: [...data.config.evaluators],
      systemPrompt: data.config.systemPrompt,
    },
    dataset: {
      fileName: data.dataset.fileName,
      rowCount: data.dataset.rowCount,
      columns: [...data.dataset.columns],
    },
    experiments: data.config.models.map((m) => ({
      modelSlug: m.slug,
      phoenixExperimentId: '',
      status: 'pending',
      scores: {},
      results: [],
      metrics: { avgLatencyMs: 0, totalTokens: { input: 0, output: 0 }, estimatedCost: 0 },
    })),
  })
  return serialize(session.toJSON())
}

export async function getEvaluationSessions(): Promise<IEvaluationSessionSummary[]> {
  await getConnection()
  const sessions = await EvaluationSessionModel.find()
    .sort({ createdAt: -1 })
    .select('name status dataset config createdAt')
    .lean()

  return sessions.map((s) => serialize({
    _id: s._id,
    name: s.name,
    status: s.status,
    dataset: s.dataset,
    modelCount: s.config?.models?.length ?? 0,
    createdAt: s.createdAt,
  }))
}

export async function getEvaluationSessionById(id: string): Promise<IEvaluationSession | null> {
  await getConnection()
  const session = await EvaluationSessionModel.findById(id).lean()
  if (!session) return null
  return serialize(session)
}

export async function getEvaluationProgress(id: string): Promise<IEvaluationProgress | null> {
  await getConnection()
  const session = await EvaluationSessionModel.findById(id)
    .select('status experiments.modelSlug experiments.status experiments.results')
    .lean()
  if (!session) return null

  const totalRows = session.experiments.reduce((sum, e) => sum + e.results.length, 0)
  const expectedRows = session.dataset?.rowCount ?? 0
  const totalExpected = expectedRows * session.experiments.length

  return {
    status: session.status,
    progress: { completed: totalRows, total: totalExpected },
    experiments: session.experiments.map((e) => ({
      modelSlug: e.modelSlug,
      status: e.status,
    })),
  }
}

export async function updateSessionStatus(
  id: string,
  status: 'running' | 'completed' | 'failed',
  extra?: Record<string, unknown>,
) {
  await getConnection()
  await EvaluationSessionModel.findByIdAndUpdate(id, {
    status,
    ...(status === 'running' && { startedAt: new Date() }),
    ...(status === 'completed' && { completedAt: new Date() }),
    ...extra,
  })
}

export async function updateExperimentResult(
  sessionId: string,
  modelSlug: string,
  update: Record<string, unknown>,
) {
  await getConnection()
  await EvaluationSessionModel.findOneAndUpdate(
    { _id: sessionId, 'experiments.modelSlug': modelSlug },
    { $set: Object.fromEntries(
      Object.entries(update).map(([k, v]) => [`experiments.$.${k}`, v])
    ) },
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/services/evaluation.service.test.ts --no-cache 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/evaluation.service.ts src/__tests__/services/evaluation.service.test.ts
git commit -m "feat: add evaluation service for session CRUD and orchestration"
```

---

## Chunk 3: API Routes

### Task 7: Upload route

**Files:**
- Create: `src/app/api/evaluation/upload/route.ts`
- Create: `src/__tests__/api/evaluation/upload.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/evaluation/upload.test.ts
import { POST } from '@/app/api/evaluation/upload/route'

function createFormData(csvContent: string, fileName = 'test.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const file = new File([blob], fileName, { type: 'text/csv' })
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

describe('POST /api/evaluation/upload', () => {
  it('parses valid CSV and returns columns, rows, preview', async () => {
    const csv = 'question,ground_truth\nWhat is 1+1?,2\nWhat is 2+2?,4'
    const formData = createFormData(csv)
    const request = new Request('http://localhost/api/evaluation/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.columns).toContain('question')
    expect(data.data.columns).toContain('ground_truth')
    expect(data.data.rowCount).toBe(2)
    expect(data.data.rows).toHaveLength(2)
    expect(data.data.preview).toHaveLength(2)
  })

  it('rejects file without required columns', async () => {
    const csv = 'name,value\nfoo,bar'
    const formData = createFormData(csv)
    const request = new Request('http://localhost/api/evaluation/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('rejects file with more than 200 rows', async () => {
    const header = 'question,ground_truth'
    const rows = Array.from({ length: 201 }, (_, i) => `q${i},a${i}`).join('\n')
    const csv = `${header}\n${rows}`
    const formData = createFormData(csv)
    const request = new Request('http://localhost/api/evaluation/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('rejects empty file', async () => {
    const csv = 'question,ground_truth'
    const formData = createFormData(csv)
    const request = new Request('http://localhost/api/evaluation/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/api/evaluation/upload.test.ts --no-cache 2>&1 | tail -5
```

- [ ] **Step 3: Implement upload route**

```typescript
// src/app/api/evaluation/upload/route.ts
import * as XLSX from 'xlsx'

const MAX_ROWS = 200
const REQUIRED_COLUMNS = ['question', 'ground_truth']

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      )
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return Response.json(
        { success: false, error: 'Empty workbook' },
        { status: 400 },
      )
    }

    const sheet = workbook.Sheets[sheetName]
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      return Response.json(
        { success: false, error: 'File contains no data rows' },
        { status: 400 },
      )
    }

    if (rows.length > MAX_ROWS) {
      return Response.json(
        { success: false, error: `File exceeds maximum of ${MAX_ROWS} rows (found ${rows.length})` },
        { status: 400 },
      )
    }

    const columns = Object.keys(rows[0])
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !columns.includes(col))
    if (missingColumns.length > 0) {
      return Response.json(
        { success: false, error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 },
      )
    }

    const preview = rows.slice(0, 5)

    return Response.json({
      success: true,
      data: { columns, rowCount: rows.length, preview, rows },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse file'
    return Response.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/api/evaluation/upload.test.ts --no-cache 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/evaluation/upload/route.ts src/__tests__/api/evaluation/upload.test.ts
git commit -m "feat: add evaluation upload API route with Excel parsing"
```

---

### Task 8: Run route

**Files:**
- Create: `src/app/api/evaluation/run/route.ts`
- Create: `src/__tests__/api/evaluation/run.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/evaluation/run.test.ts
jest.mock('@/lib/db/connection', () => ({ getConnection: jest.fn() }))
jest.mock('@/lib/services/evaluation.service', () => ({
  createEvaluationSession: jest.fn().mockResolvedValue({ _id: 'sess-1' }),
  updateSessionStatus: jest.fn(),
  updateExperimentResult: jest.fn(),
}))
jest.mock('@/lib/services/phoenix.service', () => ({
  checkPhoenixHealth: jest.fn().mockResolvedValue(true),
  createPhoenixDataset: jest.fn().mockResolvedValue({ datasetId: 'ds-1' }),
  buildEvaluators: jest.fn().mockResolvedValue([]),
  runPhoenixExperiment: jest.fn().mockResolvedValue({ runs: [], evaluations: {} }),
}))
jest.mock('@/lib/services/openrouter.service', () => ({
  completeChatCompletion: jest.fn().mockResolvedValue({
    content: 'test response',
    usage: { promptTokens: 10, completionTokens: 5 },
  }),
}))

import { POST } from '@/app/api/evaluation/run/route'

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/evaluation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: 'Test Eval',
  rows: [{ question: 'Q1', ground_truth: 'A1' }],
  fileName: 'test.csv',
  columns: ['question', 'ground_truth'],
  models: [{
    modelId: '507f1f77bcf86cd799439011',
    slug: 'gpt-4o',
    openRouterModelId: 'openai/gpt-4o',
    modelName: 'GPT-4o',
    provider: 'OpenAI',
    parameters: { temperature: 0, maxTokens: 1024 },
  }],
  evaluators: ['correctness'],
}

describe('POST /api/evaluation/run', () => {
  it('returns sessionId on valid request', async () => {
    const response = await POST(makeRequest(validBody))
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.sessionId).toBe('sess-1')
  })

  it('rejects request without models', async () => {
    const response = await POST(makeRequest({ ...validBody, models: [] }))
    expect(response.status).toBe(400)
  })

  it('rejects request with too many models', async () => {
    const models = Array.from({ length: 4 }, () => validBody.models[0])
    const response = await POST(makeRequest({ ...validBody, models }))
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/api/evaluation/run.test.ts --no-cache 2>&1 | tail -5
```

- [ ] **Step 3: Implement run route**

```typescript
// src/app/api/evaluation/run/route.ts
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

const runRequestSchema = z.object({
  name: z.string().min(1).max(200),
  rows: z.array(z.record(z.string())).min(1).max(200),
  fileName: z.string(),
  columns: z.array(z.string()),
  models: z.array(z.object({
    modelId: z.string(),
    slug: z.string(),
    openRouterModelId: z.string(),
    modelName: z.string(),
    provider: z.string(),
    parameters: z.object({
      temperature: z.number().min(0).max(2).default(0),
      maxTokens: z.number().int().min(1).max(128000).default(1024),
    }),
  })).min(1).max(3),
  evaluators: z.array(z.enum(['correctness', 'relevance', 'hallucination'])).min(1),
  systemPrompt: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(clientIp)) {
      return Response.json(
        { success: false, error: 'Rate limit exceeded. Max 3 evaluations per minute.' },
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

    // Health check
    const healthy = await checkPhoenixHealth()
    if (!healthy) {
      return Response.json(
        { success: false, error: 'Phoenix server is not reachable. Check PHOENIX_HOST configuration.' },
        { status: 503 },
      )
    }

    // Create session
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

    // Start async execution (fire-and-forget for Phase 1 sync)
    // In Phase 1, we run synchronously but return the session ID immediately
    // The client polls /status for progress
    executeEvaluation(session._id, validated).catch(() => {})

    return Response.json({
      success: true,
      data: { sessionId: session._id, status: 'running' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start evaluation'
    return Response.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

async function executeEvaluation(
  sessionId: string,
  config: z.infer<typeof runRequestSchema>,
) {
  try {
    await updateSessionStatus(sessionId, 'running')

    // Create Phoenix dataset
    const { datasetId } = await createPhoenixDataset({
      name: config.name,
      rows: config.rows,
    })

    // Update session with Phoenix dataset ID
    await updateSessionStatus(sessionId, 'running', {
      'config.phoenixDatasetId': datasetId,
    })

    // Build evaluators
    const evaluators = await buildEvaluators(config.evaluators)

    // Run experiment for each model
    for (const model of config.models) {
      try {
        await updateExperimentResult(sessionId, model.slug, { status: 'running' })

        const messages = config.systemPrompt
          ? [{ role: 'system' as const, content: config.systemPrompt }]
          : []

        // Create task function for this model
        const task = async (example: { input: Record<string, unknown> }) => {
          const question = String(example.input.question ?? '')
          const start = Date.now()
          const result = await completeChatCompletion({
            model: model.openRouterModelId,
            messages: [
              ...messages,
              { role: 'user' as const, content: question },
            ],
            temperature: model.parameters.temperature,
            maxTokens: model.parameters.maxTokens,
          })
          return result.content
        }

        // Run experiment
        await runPhoenixExperiment({
          datasetId,
          experimentName: `${config.name} - ${model.modelName}`,
          task,
          evaluators,
        })

        await updateExperimentResult(sessionId, model.slug, { status: 'completed' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Experiment failed'
        await updateExperimentResult(sessionId, model.slug, {
          status: 'failed',
        })
        // Error already recorded via updateExperimentResult status: 'failed'
      }
    }

    await updateSessionStatus(sessionId, 'completed')
  } catch (error) {
    await updateSessionStatus(sessionId, 'failed')
    // Error already recorded via updateSessionStatus 'failed'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/api/evaluation/run.test.ts --no-cache 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/evaluation/run/route.ts src/__tests__/api/evaluation/run.test.ts
git commit -m "feat: add evaluation run API route with Phoenix integration"
```

---

### Task 9: Session routes (list, detail, status)

**Files:**
- Create: `src/app/api/evaluation/sessions/route.ts`
- Create: `src/app/api/evaluation/sessions/[id]/route.ts`
- Create: `src/app/api/evaluation/sessions/[id]/status/route.ts`

- [ ] **Step 1: Implement sessions list route**

```typescript
// src/app/api/evaluation/sessions/route.ts
import { getEvaluationSessions } from '@/lib/services/evaluation.service'

export async function GET() {
  try {
    const sessions = await getEvaluationSessions()
    return Response.json({ success: true, data: { sessions } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sessions'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Implement session detail route**

```typescript
// src/app/api/evaluation/sessions/[id]/route.ts
import { getEvaluationSessionById } from '@/lib/services/evaluation.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id.match(/^[a-f\d]{24}$/i)) {
      return Response.json({ success: false, error: 'Invalid session ID' }, { status: 400 })
    }

    const session = await getEvaluationSessionById(id)
    if (!session) {
      return Response.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    return Response.json({ success: true, data: { session } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch session'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Implement status polling route**

```typescript
// src/app/api/evaluation/sessions/[id]/status/route.ts
import { getEvaluationProgress } from '@/lib/services/evaluation.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id.match(/^[a-f\d]{24}$/i)) {
      return Response.json({ success: false, error: 'Invalid session ID' }, { status: 400 })
    }

    const progress = await getEvaluationProgress(id)
    if (!progress) {
      return Response.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    return Response.json({ success: true, data: progress })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch status'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npx next build 2>&1 | tail -20
```

Expected: Build succeeds (or only unrelated warnings)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/evaluation/sessions/
git commit -m "feat: add evaluation session list, detail, and status API routes"
```

---

## Chunk 4: UI Components

### Task 10: Shared components (badge, upload zone, preview table)

**Files:**
- Create: `src/components/evaluation/session-status-badge.tsx`
- Create: `src/components/evaluation/file-upload-zone.tsx`
- Create: `src/components/evaluation/data-preview-table.tsx`

- [ ] **Step 1: Create status badge**

```typescript
// src/components/evaluation/session-status-badge.tsx
import { Badge } from '@/components/ui/badge'
import type { EvaluationStatus } from '@/lib/types/evaluation'

const STATUS_CONFIG: Record<EvaluationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  running: { label: 'Running', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function SessionStatusBadge({ status }: { readonly status: EvaluationStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
```

- [ ] **Step 2: Create file upload zone**

```typescript
// src/components/evaluation/file-upload-zone.tsx
'use client'

import { useCallback, useRef, useState } from 'react'

interface FileUploadZoneProps {
  readonly onUpload: (file: File) => void
  readonly isLoading: boolean
  readonly error?: string
}

export function FileUploadZone({ onUpload, isLoading, error }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['xlsx', 'csv', 'xls'].includes(ext)) {
      return
    }
    onUpload(file)
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
        ${error ? 'border-destructive' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Parsing file...</p>
      ) : (
        <>
          <p className="text-2xl text-muted-foreground/50 mb-2">+</p>
          <p className="text-sm text-muted-foreground">Drop .xlsx or .csv file here</p>
          <p className="text-xs text-muted-foreground/50 mt-1">or click to browse</p>
        </>
      )}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create data preview table**

```typescript
// src/components/evaluation/data-preview-table.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataPreviewTableProps {
  readonly columns: readonly string[]
  readonly preview: readonly Record<string, string>[]
  readonly totalRows: number
}

export function DataPreviewTable({ columns, preview, totalRows }: DataPreviewTableProps) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">Preview ({Math.min(preview.length, 5)} of {totalRows} rows)</div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col} className="max-w-[200px] truncate">
                    {row[col] ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep -i "evaluation" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/evaluation/session-status-badge.tsx src/components/evaluation/file-upload-zone.tsx src/components/evaluation/data-preview-table.tsx
git commit -m "feat: add evaluation shared components — badge, upload zone, preview table"
```

---

### Task 11: Evaluator selector and progress components

**Files:**
- Create: `src/components/evaluation/evaluator-selector.tsx`
- Create: `src/components/evaluation/evaluation-progress.tsx`

- [ ] **Step 1: Create evaluator selector**

```typescript
// src/components/evaluation/evaluator-selector.tsx
'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { EvaluatorName } from '@/lib/types/evaluation'

const EVALUATOR_OPTIONS: { name: EvaluatorName; label: string; description: string }[] = [
  { name: 'correctness', label: 'Correctness', description: 'ground truth와의 의미적 일치도' },
  { name: 'relevance', label: 'Relevance', description: '질문에 대한 응답 관련성' },
  { name: 'hallucination', label: 'Hallucination', description: '허위 정보 포함 여부 탐지' },
]

interface EvaluatorSelectorProps {
  readonly selected: readonly EvaluatorName[]
  readonly onChange: (evaluators: EvaluatorName[]) => void
}

export function EvaluatorSelector({ selected, onChange }: EvaluatorSelectorProps) {
  const toggle = (name: EvaluatorName) => {
    const next = selected.includes(name)
      ? selected.filter((e) => e !== name)
      : [...selected, name]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm text-muted-foreground">Evaluators</Label>
      {EVALUATOR_OPTIONS.map((opt) => (
        <div key={opt.name} className="flex items-center gap-3">
          <Checkbox
            id={`eval-${opt.name}`}
            checked={selected.includes(opt.name)}
            onCheckedChange={() => toggle(opt.name)}
          />
          <Label htmlFor={`eval-${opt.name}`} className="text-sm cursor-pointer">
            {opt.label}
            <span className="text-muted-foreground ml-2 font-normal">— {opt.description}</span>
          </Label>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create evaluation progress**

```typescript
// src/components/evaluation/evaluation-progress.tsx
'use client'

import { SessionStatusBadge } from './session-status-badge'
import type { IEvaluationProgress } from '@/lib/types/evaluation'

interface EvaluationProgressProps {
  readonly progress: IEvaluationProgress
}

export function EvaluationProgress({ progress }: EvaluationProgressProps) {
  const pct = progress.progress.total > 0
    ? Math.round((progress.progress.completed / progress.progress.total) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Evaluation Progress</span>
        <SessionStatusBadge status={progress.status} />
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {progress.progress.completed} / {progress.progress.total} rows completed ({pct}%)
      </div>
      <div className="space-y-2">
        {progress.experiments.map((exp) => (
          <div key={exp.modelSlug} className="flex items-center justify-between text-sm">
            <span>{exp.modelSlug}</span>
            <SessionStatusBadge status={exp.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/evaluation/evaluator-selector.tsx src/components/evaluation/evaluation-progress.tsx
git commit -m "feat: add evaluator selector and progress components"
```

---

### Task 12: Result components (score card, chart, result table)

**Files:**
- Create: `src/components/evaluation/score-summary-card.tsx`
- Create: `src/components/evaluation/score-comparison-chart.tsx`
- Create: `src/components/evaluation/evaluation-result-table.tsx`

- [ ] **Step 1: Create score summary card**

```typescript
// src/components/evaluation/score-summary-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { IExperimentResult } from '@/lib/types/evaluation'

interface ScoreSummaryCardProps {
  readonly experiment: IExperimentResult
  readonly isBest?: boolean
}

export function ScoreSummaryCard({ experiment, isBest }: ScoreSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{experiment.modelSlug}</CardTitle>
          {isBest && <Badge variant="outline" className="text-green-500 border-green-500">Best</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {Object.entries(experiment.scores).map(([key, value]) => (
            value != null && (
              <div key={key}>
                <div className="text-2xl font-bold">{Math.round(value * 100)}%</div>
                <div className="text-xs text-muted-foreground capitalize">{key}</div>
              </div>
            )
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>Avg {Math.round(experiment.metrics.avgLatencyMs)}ms</span>
          <span>${experiment.metrics.estimatedCost.toFixed(4)}</span>
          <span>{(experiment.metrics.totalTokens.input + experiment.metrics.totalTokens.output).toLocaleString()} tokens</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create score comparison chart**

```typescript
// src/components/evaluation/score-comparison-chart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IExperimentResult, EvaluatorName } from '@/lib/types/evaluation'

const MODEL_COLORS = ['#3b82f6', '#f59e0b', '#22c55e']

interface ScoreComparisonChartProps {
  readonly experiments: readonly IExperimentResult[]
  readonly evaluators: readonly EvaluatorName[]
}

export function ScoreComparisonChart({ experiments, evaluators }: ScoreComparisonChartProps) {
  const data = evaluators.map((evaluator) => {
    const entry: Record<string, string | number> = { evaluator }
    experiments.forEach((exp) => {
      entry[exp.modelSlug] = Math.round((exp.scores[evaluator] ?? 0) * 100)
    })
    return entry
  })

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="evaluator" />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Legend />
          {experiments.map((exp, i) => (
            <Bar
              key={exp.modelSlug}
              dataKey={exp.modelSlug}
              fill={MODEL_COLORS[i % MODEL_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Create evaluation result table**

```typescript
// src/components/evaluation/evaluation-result-table.tsx
'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { IExperimentResult } from '@/lib/types/evaluation'

interface EvaluationResultTableProps {
  readonly experiments: readonly IExperimentResult[]
}

export function EvaluationResultTable({ experiments }: EvaluationResultTableProps) {
  if (experiments.length === 0) return null

  const rowCount = experiments[0].results.length

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Question</TableHead>
            {experiments.map((exp) => (
              <TableHead key={exp.modelSlug} className="text-center">
                {exp.modelSlug}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }, (_, rowIdx) => (
            <TableRow key={rowIdx}>
              <TableCell className="text-muted-foreground">{rowIdx + 1}</TableCell>
              <TableCell className="max-w-[300px] truncate">
                {experiments[0].results[rowIdx]?.question ?? ''}
              </TableCell>
              {experiments.map((exp) => {
                const result = exp.results[rowIdx]
                const evals = result?.evaluations ?? {}
                const allPass = Object.values(evals).every((e) => e && e.score >= 1)
                return (
                  <TableCell key={exp.modelSlug} className="text-center">
                    <span className={allPass ? 'text-green-500' : 'text-red-500'}>
                      {allPass ? 'Pass' : 'Fail'}
                    </span>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/evaluation/score-summary-card.tsx src/components/evaluation/score-comparison-chart.tsx src/components/evaluation/evaluation-result-table.tsx
git commit -m "feat: add evaluation result components — score card, chart, result table"
```

---

### Task 13: Session list and setup components

**Files:**
- Create: `src/components/evaluation/session-list.tsx`
- Create: `src/components/evaluation/evaluation-setup.tsx`

- [ ] **Step 1: Create session list**

```typescript
// src/components/evaluation/session-list.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { SessionStatusBadge } from './session-status-badge'
import type { IEvaluationSessionSummary } from '@/lib/types/evaluation'

interface SessionListProps {
  readonly sessions: readonly IEvaluationSessionSummary[]
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No evaluation sessions yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Link key={session._id} href={`/evaluation/result/${session._id}`}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="font-medium text-sm">{session.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {session.dataset.rowCount} rows | {session.modelCount} models |{' '}
                  {new Date(session.createdAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <SessionStatusBadge status={session.status} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create evaluation setup (main form orchestrator)**

This is the main client component for `/evaluation` page. It orchestrates upload, model selection, evaluator selection, and run. Due to size, keep model selection inline (reusing a simple select pattern) rather than importing the Playground's `model-selector.tsx` which is tightly coupled to Playground state.

```typescript
// src/components/evaluation/evaluation-setup.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUploadZone } from './file-upload-zone'
import { DataPreviewTable } from './data-preview-table'
import { EvaluatorSelector } from './evaluator-selector'
import type {
  IEvaluationUploadResponse,
  IEvaluationModelConfig,
  EvaluatorName,
} from '@/lib/types/evaluation'

interface AvailableModel {
  readonly _id: string
  readonly slug: string
  readonly name: string
  readonly provider: { readonly name: string }
  readonly openRouterModelId: string
}

export function EvaluationSetup() {
  const router = useRouter()

  // Upload state
  const [uploadResult, setUploadResult] = useState<IEvaluationUploadResponse | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string>()

  // Config state
  const [name, setName] = useState('')
  const [selectedModels, setSelectedModels] = useState<IEvaluationModelConfig[]>([])
  const [evaluators, setEvaluators] = useState<EvaluatorName[]>(['correctness'])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string>()

  // Fetch models on mount
  useEffect(() => {
    fetch('/api/models?limit=200')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const models = data.data.filter((m: AvailableModel) => m.openRouterModelId)
          setAvailableModels(models)
        }
      })
      .catch(() => {})
  }, [])

  const handleUpload = useCallback(async (file: File) => {
    setUploadLoading(true)
    setUploadError(undefined)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/evaluation/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUploadResult(data.data)
      if (!name) setName(file.name.replace(/\.\w+$/, ''))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }, [name])

  const addModel = useCallback((model: AvailableModel) => {
    if (selectedModels.length >= 3) return
    if (selectedModels.some((m) => m.modelId === model._id)) return
    setSelectedModels([...selectedModels, {
      modelId: model._id,
      slug: model.slug,
      openRouterModelId: model.openRouterModelId,
      modelName: model.name,
      provider: model.provider.name,
      parameters: { temperature: 0, maxTokens: 1024 },
    }])
  }, [selectedModels])

  const removeModel = useCallback((modelId: string) => {
    setSelectedModels(selectedModels.filter((m) => m.modelId !== modelId))
  }, [selectedModels])

  const handleRun = useCallback(async () => {
    if (!uploadResult || selectedModels.length === 0 || evaluators.length === 0) return
    setIsRunning(true)
    setRunError(undefined)
    try {
      const res = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          rows: uploadResult.rows,
          fileName: name,
          columns: uploadResult.columns,
          models: selectedModels,
          evaluators,
          systemPrompt: systemPrompt || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      router.push(`/evaluation/result/${data.data.sessionId}`)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to start evaluation')
      setIsRunning(false)
    }
  }, [uploadResult, selectedModels, evaluators, name, systemPrompt, router])

  const canRun = uploadResult && selectedModels.length > 0 && evaluators.length > 0 && name

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Upload & Preview */}
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">1. Dataset Upload</h3>
          <FileUploadZone onUpload={handleUpload} isLoading={uploadLoading} error={uploadError} />
        </div>
        {uploadResult && (
          <DataPreviewTable
            columns={[...uploadResult.columns]}
            preview={[...uploadResult.preview]}
            totalRows={uploadResult.rowCount}
          />
        )}
      </div>

      {/* Right: Configuration */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium">2. Configuration</h3>

        {/* Session Name */}
        <div>
          <Label className="text-sm text-muted-foreground">Session Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance QA Evaluation" className="mt-1" />
        </div>

        {/* Model Selection */}
        <div>
          <Label className="text-sm text-muted-foreground">Models (max 3)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedModels.map((m) => (
              <div key={m.modelId} className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-md px-3 py-1 text-sm">
                {m.modelName}
                <button onClick={() => removeModel(m.modelId)} className="text-muted-foreground hover:text-foreground ml-1">x</button>
              </div>
            ))}
            {selectedModels.length < 3 && (
              <select
                className="bg-background border rounded-md px-3 py-1 text-sm"
                value=""
                onChange={(e) => {
                  const model = availableModels.find((m) => m._id === e.target.value)
                  if (model) addModel(model)
                }}
              >
                <option value="">+ Add model</option>
                {availableModels
                  .filter((m) => !selectedModels.some((s) => s.modelId === m._id))
                  .map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
              </select>
            )}
          </div>
        </div>

        {/* Evaluators */}
        <EvaluatorSelector selected={evaluators} onChange={setEvaluators} />

        {/* System Prompt */}
        <div>
          <Label className="text-sm text-muted-foreground">System Prompt (optional)</Label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant..."
            className="mt-1 w-full min-h-[80px] bg-background border rounded-md px-3 py-2 text-sm resize-y"
          />
        </div>

        {/* Run Button */}
        <Button onClick={handleRun} disabled={!canRun || isRunning} className="w-full" size="lg">
          {isRunning
            ? 'Starting...'
            : `Run Evaluation${uploadResult ? ` (${uploadResult.rowCount} rows x ${selectedModels.length} models)` : ''}`
          }
        </Button>
        {runError && <p className="text-sm text-destructive">{runError}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/evaluation/session-list.tsx src/components/evaluation/evaluation-setup.tsx
git commit -m "feat: add evaluation setup form and session list components"
```

---

## Chunk 5: Pages and Navigation

### Task 14: Evaluation pages

**Files:**
- Create: `src/app/evaluation/page.tsx`
- Create: `src/app/evaluation/result/[id]/page.tsx`
- Create: `src/app/evaluation/history/page.tsx`

- [ ] **Step 1: Create setup page**

```typescript
// src/app/evaluation/page.tsx
import { EvaluationSetup } from '@/components/evaluation/evaluation-setup'

export default function EvaluationPage() {
  return (
    <div className="container max-w-6xl py-8">
      <h1 className="text-2xl font-bold mb-2">Evaluation</h1>
      <p className="text-muted-foreground mb-8">
        Upload a Q&A dataset, select models, and evaluate with Phoenix LLM-as-Judge.
      </p>
      <EvaluationSetup />
    </div>
  )
}
```

- [ ] **Step 2: Create result page**

```typescript
// src/app/evaluation/result/[id]/page.tsx
import { getEvaluationSessionById } from '@/lib/services/evaluation.service'
import { ScoreSummaryCard } from '@/components/evaluation/score-summary-card'
import { ScoreComparisonChart } from '@/components/evaluation/score-comparison-chart'
import { EvaluationResultTable } from '@/components/evaluation/evaluation-result-table'
import { EvaluationProgress } from '@/components/evaluation/evaluation-progress'
import { SessionStatusBadge } from '@/components/evaluation/session-status-badge'
import { notFound } from 'next/navigation'
import type { EvaluatorName } from '@/lib/types/evaluation'

export const dynamic = 'force-dynamic'

export default async function EvaluationResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getEvaluationSessionById(id)
  if (!session) notFound()

  const isRunning = session.status === 'running' || session.status === 'pending'
  const completedExperiments = session.experiments.filter((e) => e.status === 'completed')
  const phoenixUrl = process.env.PHOENIX_HOST

  // Determine best model by average score
  const bestModelSlug = completedExperiments.length > 0
    ? completedExperiments.reduce((best, exp) => {
        const scores = Object.values(exp.scores).filter((s): s is number => s != null)
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        const bestScores = Object.values(best.scores).filter((s): s is number => s != null)
        const bestAvg = bestScores.length > 0 ? bestScores.reduce((a, b) => a + b, 0) / bestScores.length : 0
        return avg > bestAvg ? exp : best
      }).modelSlug
    : null

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {session.dataset.rowCount} rows | {session.experiments.length} models |{' '}
            <SessionStatusBadge status={session.status} />
          </div>
        </div>
        {phoenixUrl && session.config.phoenixDatasetId && (
          <a
            href={`${phoenixUrl}/datasets/${session.config.phoenixDatasetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
          >
            Phoenix Dashboard ↗
          </a>
        )}
      </div>

      {/* Progress (if running) */}
      {isRunning && (
        <div className="mb-8">
          <EvaluationProgress progress={{
            status: session.status,
            progress: {
              completed: session.experiments.reduce((s, e) => s + e.results.length, 0),
              total: session.dataset.rowCount * session.experiments.length,
            },
            experiments: session.experiments.map((e) => ({
              modelSlug: e.modelSlug,
              status: e.status,
            })),
          }} />
        </div>
      )}

      {/* Score Cards */}
      {completedExperiments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {completedExperiments.map((exp) => (
              <ScoreSummaryCard
                key={exp.modelSlug}
                experiment={exp}
                isBest={exp.modelSlug === bestModelSlug}
              />
            ))}
          </div>

          {/* Chart */}
          <div className="mb-8">
            <h2 className="text-sm font-medium mb-4">Score Comparison</h2>
            <ScoreComparisonChart
              experiments={completedExperiments}
              evaluators={session.config.evaluators as EvaluatorName[]}
            />
          </div>

          {/* Results Table */}
          <div>
            <h2 className="text-sm font-medium mb-4">Individual Results</h2>
            <EvaluationResultTable experiments={completedExperiments} />
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create history page**

```typescript
// src/app/evaluation/history/page.tsx
import { getEvaluationSessions } from '@/lib/services/evaluation.service'
import { SessionList } from '@/components/evaluation/session-list'

export const dynamic = 'force-dynamic'

export default async function EvaluationHistoryPage() {
  const sessions = await getEvaluationSessions()

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-2">Evaluation History</h1>
      <p className="text-muted-foreground mb-8">Past evaluation sessions and their results.</p>
      <SessionList sessions={sessions} />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npx next build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/evaluation/
git commit -m "feat: add evaluation pages — setup, result dashboard, history"
```

---

### Task 15: Sidebar navigation update

**Files:**
- Modify: `src/components/app-sidebar.tsx`

- [ ] **Step 1: Add Evaluation to navMain**

In `src/components/app-sidebar.tsx`, add the `ClipboardCheckIcon` import and add the Evaluation item to `data.navMain` array. Add it after the Playground item:

```typescript
// Add to imports
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, ClipboardCheckIcon } from "lucide-react"
```

Add to `navMain` array after the Playground entry:

```typescript
{
  title: "Evaluation",
  url: "/evaluation",
  icon: (
    <ClipboardCheckIcon />
  ),
  items: [
    {
      title: "New Evaluation",
      url: "/evaluation",
    },
    {
      title: "History",
      url: "/evaluation/history",
    },
  ],
},
```

- [ ] **Step 2: Verify sidebar renders**

```bash
npx next build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/app-sidebar.tsx
git commit -m "feat: add Evaluation menu to sidebar navigation"
```

---

### Task 16: Final verification

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-cache 2>&1 | tail -20
```

Expected: All tests pass

- [ ] **Step 2: Run build**

```bash
npx next build 2>&1 | tail -20
```

Expected: Build succeeds

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Verify:
1. Navigate to `/evaluation` — setup form renders
2. Upload a CSV file — preview table shows
3. Navigate to `/evaluation/history` — empty state renders
4. Sidebar shows "Evaluation" menu item

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues from evaluation feature integration"
```

---

## Implementation Notes

### Phoenix SDK API Caveat

The `@arizeai/phoenix-evals` package API surface may differ from what's documented. During Task 5 implementation:
1. Run `node -e "const m = require('@arizeai/phoenix-evals/llm'); console.log(Object.keys(m))"` to inspect actual exports
2. Adjust import names (`createCorrectnessEvaluator` vs `createClassifierFn` etc.) based on actual package
3. If pre-built evaluators don't exist, fall back to `createClassifierFn` with custom prompt templates as shown in the spec

### Progress Tracking (Phase 1)

In Phase 1, progress tracking is binary per model — 0% while running, 100% when complete. `runPhoenixExperiment` returns the full batch result, so individual row progress is not available until the experiment finishes. The progress bar will jump from 0% to 33%/66%/100% as each model experiment completes. Granular per-row progress tracking is a Phase 2 enhancement.

### OpenRouter Model IDs for Judge

The `EVAL_JUDGE_MODEL` env var should use OpenRouter-format model IDs (e.g., `openai/gpt-4o-mini`), not raw provider IDs.

### Sidebar Placeholder URLs

The current sidebar uses placeholder `#` URLs for all items. The evaluation feature adds real URLs. Consider updating other sidebar items to use real URLs in a separate task (out of scope for this plan).
