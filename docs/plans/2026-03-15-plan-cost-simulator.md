# Cost Simulator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cost simulator page (`/simulator`) with 3 tabs — API cost, breakeven analysis, routing simulation — for comparing LLM operational costs.

**Architecture:** Client-side computation with server-fetched model/GPU data. All cost formulas live in pure functions (`cost-calculator.ts`) for testability. Recharts for visualization. Shared model selector across tabs, tab-specific inputs below.

**Tech Stack:** Next.js App Router, shadcn/ui (Tabs, Slider, Card, Select), Recharts (BarChart, LineChart), TypeScript

**Spec:** `docs/specs/2026-03-15-spec-cost-simulator.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/types/model.ts` | Add 3 pricing fields to IModelPricing |
| Modify | `src/lib/db/models/model.ts` | Add 3 pricing fields to Mongoose schema |
| Modify | `data/models.json` | Add cached/batch pricing for top providers |
| Modify | `src/components/layout/app-sidebar.tsx` | Add simulator nav item |
| Create | `src/lib/types/simulator.ts` | Simulator-specific types |
| Create | `src/lib/utils/cost-calculator.ts` | Pure cost calculation functions |
| Create | `src/app/simulator/page.tsx` | Server page shell |
| Create | `src/components/simulator/simulator-client.tsx` | Main client orchestrator |
| Create | `src/components/simulator/model-selector.tsx` | Model search/select (max 4) |
| Create | `src/components/simulator/common-inputs.tsx` | Shared input form |
| Create | `src/components/simulator/api-cost-tab.tsx` | Tab 1: API cost |
| Create | `src/components/simulator/breakeven-tab.tsx` | Tab 2: Breakeven |
| Create | `src/components/simulator/routing-tab.tsx` | Tab 3: Routing |
| Create | `src/components/simulator/cost-bar-chart.tsx` | Bar chart (Recharts) |
| Create | `src/components/simulator/breakeven-line-chart.tsx` | Line chart (Recharts) |
| Create | `src/components/simulator/routing-stacked-chart.tsx` | Stacked bar chart |
| Create | `src/__tests__/utils/cost-calculator.test.ts` | Unit tests for calculator |
| Create | `src/__tests__/components/simulator/simulator.test.tsx` | Component integration tests |

---

## Chunk 1: Foundation (Tasks 1-4)

### Task 1: Extend IModelPricing Type + Mongoose Schema

**Files:**
- Modify: `src/lib/types/model.ts:1-5`
- Modify: `src/lib/db/models/model.ts:36-40,111-115`

- [ ] **Step 1: Add 3 fields to IModelPricing interface**

```typescript
// src/lib/types/model.ts — replace IModelPricing
export interface IModelPricing {
  readonly inputPer1m: number | null
  readonly outputPer1m: number | null
  readonly pricingType: string
  readonly cachedInputPer1m: number | null
  readonly batchInputPer1m: number | null
  readonly batchOutputPer1m: number | null
}
```

- [ ] **Step 2: Add 3 fields to Mongoose schema**

```typescript
// src/lib/db/models/model.ts — in the pricing block
pricing: {
  inputPer1m:  Number,
  outputPer1m: Number,
  pricingType: String,
  cachedInputPer1m: Number,
  batchInputPer1m: Number,
  batchOutputPer1m: Number,
},
```

- [ ] **Step 3: Add 3 fields to IModelDocument interface**

```typescript
// src/lib/db/models/model.ts — in the IModelDocument pricing block
pricing: {
  inputPer1m: number
  outputPer1m: number
  pricingType: string
  cachedInputPer1m: number | null
  batchInputPer1m: number | null
  batchOutputPer1m: number | null
}
```

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `npx jest --passWithNoTests 2>&1 | tail -5`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/model.ts src/lib/db/models/model.ts
git commit -m "feat: extend IModelPricing with cached/batch pricing fields"
```

---

### Task 2: Update Seed Data with Cached/Batch Pricing

**Files:**
- Modify: `data/models.json`

- [ ] **Step 1: Add cached/batch pricing to commercial models in models.json**

For each commercial model (`pricingType: "api"`), add the 3 new fields. **Apply the discount rate to each model's own `inputPer1m`/`outputPer1m`**, not a fixed template:

**OpenAI models** (50% cache, 50% batch discount):
```json
"cachedInputPer1m": <that model's inputPer1m * 0.5>,
"batchInputPer1m": <that model's inputPer1m * 0.5>,
"batchOutputPer1m": <that model's outputPer1m * 0.5>
```

**Anthropic models** (90% cache, 50% batch discount):
```json
"cachedInputPer1m": <that model's inputPer1m * 0.1>,
"batchInputPer1m": <that model's inputPer1m * 0.5>,
"batchOutputPer1m": <that model's outputPer1m * 0.5>
```

**Google models** (75% cache, 50% batch discount):
```json
"cachedInputPer1m": <that model's inputPer1m * 0.25>,
"batchInputPer1m": <that model's inputPer1m * 0.5>,
"batchOutputPer1m": <that model's outputPer1m * 0.5>
```

**Other providers** (xAI, etc.) — set all 3 to `null` (fallback to 50% default in calculator).

**OSS models** (`pricingType: "self-hosted"`) — set all 3 to `null`.

- [ ] **Step 1b: Verify GPU cloudHourly data**

Check `data/gpus.json` for any entries with missing or zero `cloudHourly`. Backfill with Lambda Labs / RunPod reference prices if needed (per spec section 7.2).

- [ ] **Step 2: Validate JSON is well-formed**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/models.json','utf8')); console.log('Valid JSON')"`
Expected: "Valid JSON"

- [ ] **Step 3: Commit**

```bash
git add data/models.json
git commit -m "feat: add cached/batch pricing data for top providers"
```

---

### Task 3: Create Simulator Types

**Files:**
- Create: `src/lib/types/simulator.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/lib/types/simulator.ts
import type { IModel } from './model'
import type { IGpuReference } from './gpu'

export interface ISimulatorInputs {
  readonly dailyRequests: number
  readonly avgInputTokens: number
  readonly avgOutputTokens: number
  readonly monthlyDays: number
}

export interface IApiCostInputs {
  readonly cacheRate: number    // 0-1
  readonly batchRate: number    // 0-1
}

export interface IBreakevenInputs {
  readonly gpu: IGpuReference | null
  readonly hourlyRate: number
  readonly gpuCount: number
  readonly dailyHours: number
  readonly monthlyOverhead: number
}

export interface IRoutingConfig {
  readonly modelId: string
  readonly ratio: number       // 0-1, sum = 1
}

export interface IModelCostBreakdown {
  readonly model: IModel
  readonly realtimeInputCost: number
  readonly cachedInputCost: number
  readonly batchInputCost: number
  readonly batchCachedInputCost: number
  readonly realtimeOutputCost: number
  readonly batchOutputCost: number
  readonly totalMonthlyCost: number
  readonly totalAnnualCost: number
}

export interface IBreakevenResult {
  readonly selfHostedMonthlyCost: number
  readonly apiMonthlyCost: number
  readonly breakevenDailyRequests: number | null  // null = never crosses
  readonly chartData: readonly IBreakevenChartPoint[]
}

export interface IBreakevenChartPoint {
  readonly dailyRequests: number
  readonly apiCost: number
  readonly selfHostedCost: number
}

export interface IRoutingResult {
  readonly routedMonthlyCost: number
  readonly baselineMonthlyCost: number
  readonly savingsRate: number
  readonly perModelCosts: readonly {
    readonly modelName: string
    readonly ratio: number
    readonly cost: number
  }[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/simulator.ts
git commit -m "feat: add simulator type definitions"
```

---

### Task 4: Build Cost Calculator (TDD)

**Files:**
- Create: `src/lib/utils/cost-calculator.ts`
- Create: `src/__tests__/utils/cost-calculator.test.ts`

- [ ] **Step 1: Write failing tests for resolvePrice**

```typescript
// src/__tests__/utils/cost-calculator.test.ts
import {
  resolvePrice,
  calculateApiCost,
  calculateBreakeven,
  calculateRouting,
} from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

const mockCommercialModel: IModel = {
  name: 'Test Model',
  slug: 'test-model',
  providerId: 'openai',
  type: 'commercial',
  tier: 'flagship',
  pricing: {
    inputPer1m: 10,
    outputPer1m: 30,
    pricingType: 'api',
    cachedInputPer1m: 5,
    batchInputPer1m: 5,
    batchOutputPer1m: 15,
  },
} as IModel

const mockAnthropicModel: IModel = {
  ...mockCommercialModel,
  name: 'Anthropic Model',
  slug: 'anthropic-model',
  providerId: 'anthropic',
  pricing: {
    inputPer1m: 10,
    outputPer1m: 30,
    pricingType: 'api',
    cachedInputPer1m: null,
    batchInputPer1m: null,
    batchOutputPer1m: null,
  },
} as IModel

const mockOssModel: IModel = {
  ...mockCommercialModel,
  name: 'OSS Model',
  slug: 'oss-model',
  type: 'open-source',
  pricing: {
    inputPer1m: null,
    outputPer1m: null,
    pricingType: 'self-hosted',
    cachedInputPer1m: null,
    batchInputPer1m: null,
    batchOutputPer1m: null,
  },
} as IModel

const defaultInputs: ISimulatorInputs = {
  dailyRequests: 1000,
  avgInputTokens: 500,
  avgOutputTokens: 300,
  monthlyDays: 30,
}

const defaultApiInputs: IApiCostInputs = {
  cacheRate: 0,
  batchRate: 0,
}

describe('resolvePrice', () => {
  it('returns explicit cached price when available', () => {
    const result = resolvePrice(mockCommercialModel)
    expect(result.cachedInputPer1m).toBe(5)
    expect(result.batchInputPer1m).toBe(5)
    expect(result.batchOutputPer1m).toBe(15)
  })

  it('calculates fallback prices using provider discount', () => {
    const result = resolvePrice(mockAnthropicModel)
    // Anthropic: 90% cache discount => 10 * 0.1 = 1
    expect(result.cachedInputPer1m).toBe(1)
    // Anthropic: 50% batch discount => 10 * 0.5 = 5
    expect(result.batchInputPer1m).toBe(5)
    expect(result.batchOutputPer1m).toBe(15)
  })

  it('uses default 50% discount for unknown providers', () => {
    const model = { ...mockAnthropicModel, providerId: 'unknown' } as IModel
    const result = resolvePrice(model)
    expect(result.cachedInputPer1m).toBe(5)  // 10 * 0.5
    expect(result.batchInputPer1m).toBe(5)   // 10 * 0.5
    expect(result.batchOutputPer1m).toBe(15)  // 30 * 0.5
  })
})

describe('calculateApiCost', () => {
  it('calculates basic cost with no caching or batch', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, defaultApiInputs)
    // monthly input tokens: 1000 * 500 * 30 = 15,000,000
    // monthly output tokens: 1000 * 300 * 30 = 9,000,000
    // cost: (15M * 10 + 9M * 30) / 1M = 150 + 270 = 420
    expect(result.totalMonthlyCost).toBe(420)
    expect(result.totalAnnualCost).toBe(5040)
  })

  it('applies caching discount to input tokens', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, {
      cacheRate: 0.5,
      batchRate: 0,
    })
    // realtime input: 7.5M * 10 = 75
    // cached input: 7.5M * 5 = 37.5
    // output: 9M * 30 = 270
    // total: 75 + 37.5 + 270 = 382.5
    expect(result.totalMonthlyCost).toBe(382.5)
  })

  it('applies batch discount to both input and output', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, {
      cacheRate: 0,
      batchRate: 1.0,
    })
    // all input via batch: 15M * 5 = 75
    // all output via batch: 9M * 15 = 135
    // total: 75 + 135 = 210
    expect(result.totalMonthlyCost).toBe(210)
  })

  it('returns zero cost for OSS models', () => {
    const result = calculateApiCost(mockOssModel, defaultInputs, defaultApiInputs)
    expect(result.totalMonthlyCost).toBe(0)
  })

  it('handles combined cache + batch with multiplicative stacking', () => {
    const result = calculateApiCost(mockCommercialModel, defaultInputs, {
      cacheRate: 0.5,
      batchRate: 0.5,
    })
    // Input segments (15M total):
    //   realtime (25%): 3.75M * 10 = 37.5
    //   cached (25%): 3.75M * 5 = 18.75
    //   batch (25%): 3.75M * 5 = 18.75
    //   batch+cached (25%): 3.75M * (5 * 5/10) = 3.75M * 2.5 = 9.375
    // Output segments (9M total):
    //   realtime (50%): 4.5M * 30 = 135
    //   batch (50%): 4.5M * 15 = 67.5
    // total: 37.5 + 18.75 + 18.75 + 9.375 + 135 + 67.5 = 286.875
    expect(result.totalMonthlyCost).toBeCloseTo(286.875)
  })
})

describe('calculateBreakeven', () => {
  it('finds breakeven point where self-hosted becomes cheaper', () => {
    const result = calculateBreakeven({
      commercialModel: mockCommercialModel,
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
      hourlyRate: 2.0,
      gpuCount: 1,
      dailyHours: 24,
      monthlyDays: 30,
      monthlyOverhead: 0,
    })
    // Self-hosted: $2 * 1 * 24 * 30 = $1440/mo (fixed)
    // API: scales with requests
    // At 1000 req/day: API = $420, self-hosted = $1440 → API cheaper
    // Breakeven: 1440 / (420/1000) = ~3429 req/day
    expect(result.selfHostedMonthlyCost).toBe(1440)
    expect(result.apiMonthlyCost).toBe(420)
    expect(result.breakevenDailyRequests).toBeGreaterThan(3000)
    expect(result.breakevenDailyRequests).toBeLessThan(4000)
    expect(result.chartData.length).toBeGreaterThan(0)
  })

  it('returns null breakeven when API cost is zero (OSS model)', () => {
    const result = calculateBreakeven({
      commercialModel: mockOssModel,
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
      hourlyRate: 2.0,
      gpuCount: 1,
      dailyHours: 24,
      monthlyDays: 30,
      monthlyOverhead: 0,
    })
    // OSS model has $0 API cost, so costPerRequest = 0 => breakeven = null
    expect(result.breakevenDailyRequests).toBeNull()
  })
})

describe('calculateRouting', () => {
  it('calculates routing savings compared to most expensive model', () => {
    const cheapModel = {
      ...mockCommercialModel,
      name: 'Cheap',
      pricing: { ...mockCommercialModel.pricing, inputPer1m: 1, outputPer1m: 3 },
    } as IModel

    const result = calculateRouting({
      models: [mockCommercialModel, cheapModel],
      ratios: [0.3, 0.7],
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
    })

    expect(result.baselineMonthlyCost).toBe(420) // expensive model at 100%
    expect(result.routedMonthlyCost).toBeLessThan(420)
    expect(result.savingsRate).toBeGreaterThan(0)
    expect(result.perModelCosts).toHaveLength(2)
  })

  it('returns 0% savings when single model at 100%', () => {
    const result = calculateRouting({
      models: [mockCommercialModel],
      ratios: [1.0],
      inputs: defaultInputs,
      apiCostInputs: defaultApiInputs,
    })
    expect(result.savingsRate).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/__tests__/utils/cost-calculator.test.ts 2>&1 | tail -5`
Expected: FAIL — module not found

- [ ] **Step 3: Implement cost-calculator.ts**

```typescript
// src/lib/utils/cost-calculator.ts
import type { IModel } from '@/lib/types/model'
import type {
  ISimulatorInputs,
  IApiCostInputs,
  IModelCostBreakdown,
  IBreakevenResult,
  IBreakevenChartPoint,
  IRoutingResult,
} from '@/lib/types/simulator'

// Provider discount rates for fallback calculation
const DISCOUNTS: Record<string, { cache: number; batch: number }> = {
  anthropic: { cache: 0.9, batch: 0.5 },
  google: { cache: 0.75, batch: 0.5 },
  openai: { cache: 0.5, batch: 0.5 },
  _default: { cache: 0.5, batch: 0.5 },
}

interface IResolvedPrices {
  readonly inputPer1m: number
  readonly outputPer1m: number
  readonly cachedInputPer1m: number
  readonly batchInputPer1m: number
  readonly batchOutputPer1m: number
}

export function resolvePrice(model: IModel): IResolvedPrices {
  const input = model.pricing.inputPer1m ?? 0
  const output = model.pricing.outputPer1m ?? 0
  const provider = model.providerId.toLowerCase()
  const discounts = DISCOUNTS[provider] ?? DISCOUNTS._default

  return {
    inputPer1m: input,
    outputPer1m: output,
    cachedInputPer1m: model.pricing.cachedInputPer1m ?? input * (1 - discounts.cache),
    batchInputPer1m: model.pricing.batchInputPer1m ?? input * (1 - discounts.batch),
    batchOutputPer1m: model.pricing.batchOutputPer1m ?? output * (1 - discounts.batch),
  }
}

export function calculateApiCost(
  model: IModel,
  inputs: ISimulatorInputs,
  apiInputs: IApiCostInputs,
): IModelCostBreakdown {
  if (model.type === 'open-source') {
    return {
      model,
      realtimeInputCost: 0,
      cachedInputCost: 0,
      batchInputCost: 0,
      batchCachedInputCost: 0,
      realtimeOutputCost: 0,
      batchOutputCost: 0,
      totalMonthlyCost: 0,
      totalAnnualCost: 0,
    }
  }

  const prices = resolvePrice(model)
  const { cacheRate, batchRate } = apiInputs
  const totalInputTokens = inputs.dailyRequests * inputs.avgInputTokens * inputs.monthlyDays
  const totalOutputTokens = inputs.dailyRequests * inputs.avgOutputTokens * inputs.monthlyDays

  const realtimeInputTokens = totalInputTokens * (1 - batchRate) * (1 - cacheRate)
  const cachedInputTokens = totalInputTokens * (1 - batchRate) * cacheRate
  const batchInputTokens = totalInputTokens * batchRate * (1 - cacheRate)
  const batchCachedInputTokens = totalInputTokens * batchRate * cacheRate

  const realtimeOutputTokens = totalOutputTokens * (1 - batchRate)
  const batchOutputTokens = totalOutputTokens * batchRate

  // Batch+cached: multiplicative stacking
  const batchCachedPrice = prices.inputPer1m > 0
    ? prices.batchInputPer1m * (prices.cachedInputPer1m / prices.inputPer1m)
    : 0

  const realtimeInputCost = (realtimeInputTokens * prices.inputPer1m) / 1_000_000
  const cachedInputCost = (cachedInputTokens * prices.cachedInputPer1m) / 1_000_000
  const batchInputCost = (batchInputTokens * prices.batchInputPer1m) / 1_000_000
  const batchCachedInputCost = (batchCachedInputTokens * batchCachedPrice) / 1_000_000
  const realtimeOutputCost = (realtimeOutputTokens * prices.outputPer1m) / 1_000_000
  const batchOutputCost = (batchOutputTokens * prices.batchOutputPer1m) / 1_000_000

  const totalMonthlyCost =
    realtimeInputCost + cachedInputCost + batchInputCost +
    batchCachedInputCost + realtimeOutputCost + batchOutputCost

  return {
    model,
    realtimeInputCost,
    cachedInputCost,
    batchInputCost,
    batchCachedInputCost,
    realtimeOutputCost,
    batchOutputCost,
    totalMonthlyCost,
    totalAnnualCost: totalMonthlyCost * 12,
  }
}

export function calculateBreakeven(options: {
  readonly commercialModel: IModel
  readonly inputs: ISimulatorInputs
  readonly apiCostInputs: IApiCostInputs
  readonly hourlyRate: number
  readonly gpuCount: number
  readonly dailyHours: number
  readonly monthlyDays: number
  readonly monthlyOverhead: number
}): IBreakevenResult {
  const {
    commercialModel, inputs, apiCostInputs,
    hourlyRate, gpuCount, dailyHours, monthlyDays, monthlyOverhead,
  } = options

  const selfHostedMonthlyCost = hourlyRate * gpuCount * dailyHours * monthlyDays + monthlyOverhead

  const apiResult = calculateApiCost(commercialModel, inputs, apiCostInputs)
  const apiMonthlyCost = apiResult.totalMonthlyCost

  // Cost per request for API
  const costPerRequest = inputs.dailyRequests > 0
    ? apiMonthlyCost / (inputs.dailyRequests * monthlyDays)
    : 0

  // Breakeven: selfHostedMonthlyCost = costPerRequest * breakevenRequests * monthlyDays
  const breakevenDailyRequests = costPerRequest > 0
    ? selfHostedMonthlyCost / (costPerRequest * monthlyDays)
    : null

  // Cap at 1M daily requests — beyond this is unrealistic
  const MAX_REASONABLE_DAILY = 1_000_000
  const finalBreakeven = breakevenDailyRequests !== null && breakevenDailyRequests <= MAX_REASONABLE_DAILY
    ? Math.round(breakevenDailyRequests)
    : null

  // Chart data: 0 to max(currentRequests * 5, breakeven * 2)
  const maxX = Math.max(
    inputs.dailyRequests * 5,
    finalBreakeven ? finalBreakeven * 2 : inputs.dailyRequests * 10,
  )

  const steps = 50
  const chartData: IBreakevenChartPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const dailyReqs = Math.round((maxX / steps) * i)
    const apiCostAtScale = costPerRequest * dailyReqs * monthlyDays
    chartData.push({
      dailyRequests: dailyReqs,
      apiCost: Math.round(apiCostAtScale * 100) / 100,
      selfHostedCost: Math.round(selfHostedMonthlyCost * 100) / 100,
    })
  }

  return {
    selfHostedMonthlyCost,
    apiMonthlyCost,
    breakevenDailyRequests: finalBreakeven,
    chartData,
  }
}

export function calculateRouting(options: {
  readonly models: readonly IModel[]
  readonly ratios: readonly number[]
  readonly inputs: ISimulatorInputs
  readonly apiCostInputs: IApiCostInputs
}): IRoutingResult {
  const { models, ratios, inputs, apiCostInputs } = options

  const modelCosts = models.map((model) =>
    calculateApiCost(model, inputs, apiCostInputs),
  )

  const baselineMonthlyCost = Math.max(...modelCosts.map((c) => c.totalMonthlyCost))

  const perModelCosts = models.map((model, i) => ({
    modelName: model.name,
    ratio: ratios[i],
    cost: modelCosts[i].totalMonthlyCost * ratios[i],
  }))

  const routedMonthlyCost = perModelCosts.reduce((sum, c) => sum + c.cost, 0)

  const savingsRate = baselineMonthlyCost > 0
    ? Math.round(((baselineMonthlyCost - routedMonthlyCost) / baselineMonthlyCost) * 10000) / 100
    : 0

  return {
    routedMonthlyCost: Math.round(routedMonthlyCost * 100) / 100,
    baselineMonthlyCost: Math.round(baselineMonthlyCost * 100) / 100,
    savingsRate,
    perModelCosts,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/utils/cost-calculator.test.ts --verbose 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/cost-calculator.ts src/__tests__/utils/cost-calculator.test.ts
git commit -m "feat: add cost calculator with TDD — resolvePrice, API cost, breakeven, routing"
```

---

## Chunk 2: UI Components (Tasks 5-9)

### Task 5: Create Simulator Types Page + Sidebar Nav

**Files:**
- Create: `src/app/simulator/page.tsx`
- Create: `src/components/simulator/simulator-client.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Create server page shell**

```typescript
// src/app/simulator/page.tsx
export const dynamic = 'force-dynamic'

import { SimulatorClient } from '@/components/simulator/simulator-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '비용 시뮬레이터 - Atom Models',
  description: 'LLM API 비용, 셀프호스팅 손익분기점, 라우팅 절감 시뮬레이션',
}

export default function SimulatorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">비용 시뮬레이터</h1>
        <p className="text-muted-foreground mt-1">
          모델별 API 비용, 셀프호스팅 손익분기점, 라우팅 절감 효과를 시뮬레이션합니다.
        </p>
      </div>
      <SimulatorClient />
    </div>
  )
}
```

- [ ] **Step 2: Create minimal client orchestrator (placeholder)**

```typescript
// src/components/simulator/simulator-client.tsx
'use client'

export function SimulatorClient() {
  return (
    <div className="text-muted-foreground text-center py-20">
      시뮬레이터 준비 중...
    </div>
  )
}
```

- [ ] **Step 3: Add simulator to sidebar navigation**

In `src/components/layout/app-sidebar.tsx`, add `Calculator` to imports and a new nav item between 'BVA 분석' and '플레이그라운드'. Check the existing import pattern — lucide-react exports may use `Calculator` (not `CalculatorIcon`):

```typescript
import { ..., Calculator } from 'lucide-react'

// In navItems array, after BVA 분석:
{ title: '비용 시뮬레이터', href: '/simulator', icon: Calculator },
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds, `/simulator` route registered

- [ ] **Step 5: Commit**

```bash
git add src/app/simulator/page.tsx src/components/simulator/simulator-client.tsx src/components/layout/app-sidebar.tsx
git commit -m "feat: add simulator page shell and sidebar navigation"
```

---

### Task 6: Build Model Selector Component

**Files:**
- Create: `src/components/simulator/model-selector.tsx`

Reference: `src/components/playground/model-selector.tsx` (same pattern, but MAX_MODELS=4, no openRouterModelId filter)

- [ ] **Step 1: Create model selector**

```typescript
// src/components/simulator/model-selector.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { IModel } from '@/lib/types/model'

const MAX_MODELS = 4

interface SimulatorModelSelectorProps {
  readonly selectedModels: readonly IModel[]
  readonly onModelsChange: (models: readonly IModel[]) => void
}

export function SimulatorModelSelector({ selectedModels, onModelsChange }: SimulatorModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<readonly IModel[]>([])
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDropdown) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  useEffect(() => {
    async function fetchModels() {
      const res = await fetch('/api/models?limit=200')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        setAvailableModels(json.data)
      }
    }
    fetchModels()
  }, [])

  const filtered = availableModels
    .filter(
      (m) =>
        !selectedModels.some((s) => s._id === m._id) &&
        (m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.providerId.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => a.providerId.localeCompare(b.providerId) || a.name.localeCompare(b.name))

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
            {model.providerId} / {model.name}
            <button onClick={() => handleRemove(model._id!)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selectedModels.length < MAX_MODELS && (
          <div className="relative" ref={containerRef}>
            <Button variant="outline" size="sm" onClick={() => setShowDropdown(!showDropdown)}>
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
                <div className="max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">결과 없음</p>
                  ) : (
                    (() => {
                      let lastProvider = ''
                      return filtered.map((model) => {
                        const showHeader = model.providerId !== lastProvider
                        lastProvider = model.providerId
                        return (
                          <div key={model._id}>
                            {showHeader && (
                              <p className="mt-1 px-2 py-1 text-xs font-medium text-muted-foreground first:mt-0">
                                {model.providerId}
                              </p>
                            )}
                            <button
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                              onClick={() => handleAdd(model)}
                            >
                              <Badge variant="outline" className="text-xs">
                                {model.type === 'commercial' ? 'API' : 'OSS'}
                              </Badge>
                              <span>{model.name}</span>
                            </button>
                          </div>
                        )
                      })
                    })()
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

- [ ] **Step 2: Commit**

```bash
git add src/components/simulator/model-selector.tsx
git commit -m "feat: add simulator model selector (max 4 models)"
```

---

### Task 7: Build Common Inputs Component

**Files:**
- Create: `src/components/simulator/common-inputs.tsx`

- [ ] **Step 1: Create common inputs form**

```typescript
// src/components/simulator/common-inputs.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { ISimulatorInputs } from '@/lib/types/simulator'

interface CommonInputsProps {
  readonly inputs: ISimulatorInputs
  readonly onChange: (inputs: ISimulatorInputs) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function CommonInputs({ inputs, onChange }: CommonInputsProps) {
  const handleChange = (field: keyof ISimulatorInputs, raw: string) => {
    const num = parseInt(raw, 10)
    if (isNaN(num)) return

    const limits: Record<keyof ISimulatorInputs, [number, number]> = {
      dailyRequests: [1, 1_000_000],
      avgInputTokens: [1, 200_000],
      avgOutputTokens: [1, 200_000],
      monthlyDays: [1, 31],
    }

    const [min, max] = limits[field]
    onChange({ ...inputs, [field]: clamp(num, min, max) })
  }

  const fields: { key: keyof ISimulatorInputs; label: string; suffix: string }[] = [
    { key: 'dailyRequests', label: '일 평균 요청 수', suffix: '건' },
    { key: 'avgInputTokens', label: '평균 Input 토큰', suffix: 'tokens' },
    { key: 'avgOutputTokens', label: '평균 Output 토큰', suffix: 'tokens' },
    { key: 'monthlyDays', label: '월 운영 일수', suffix: '일' },
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fields.map(({ key, label, suffix }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <div className="relative">
                <Input
                  id={key}
                  type="number"
                  value={inputs[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {suffix}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/simulator/common-inputs.tsx
git commit -m "feat: add simulator common inputs form"
```

---

### Task 8: Build API Cost Tab + Bar Chart

**Files:**
- Create: `src/components/simulator/api-cost-tab.tsx`
- Create: `src/components/simulator/cost-bar-chart.tsx`

- [ ] **Step 1: Create cost bar chart**

```typescript
// src/components/simulator/cost-bar-chart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import type { IModelCostBreakdown } from '@/lib/types/simulator'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea']

interface CostBarChartProps {
  readonly breakdowns: readonly IModelCostBreakdown[]
  readonly mode: 'monthly' | 'annual'
}

export function CostBarChart({ breakdowns, mode }: CostBarChartProps) {
  const data = breakdowns.map((b) => ({
    name: b.model.name,
    cost: mode === 'monthly' ? b.totalMonthlyCost : b.totalAnnualCost,
  }))

  const formatter = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis tickFormatter={formatter} className="text-xs" />
        <Tooltip formatter={formatter} />
        <Bar dataKey="cost" name={mode === 'monthly' ? '월간 비용' : '연간 비용'}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create API cost tab**

```typescript
// src/components/simulator/api-cost-tab.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CostBarChart } from './cost-bar-chart'
import { calculateApiCost } from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs, IModelCostBreakdown } from '@/lib/types/simulator'

interface ApiCostTabProps {
  readonly models: readonly IModel[]
  readonly inputs: ISimulatorInputs
  readonly apiInputs: IApiCostInputs
  readonly onApiInputsChange: (inputs: IApiCostInputs) => void
}

function formatCost(cost: number): string {
  return `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ApiCostTab({ models, inputs, apiInputs, onApiInputsChange }: ApiCostTabProps) {
  const breakdowns: readonly IModelCostBreakdown[] = useMemo(
    () => models.map((m) => calculateApiCost(m, inputs, apiInputs)),
    [models, inputs, apiInputs],
  )

  const cheapestIdx = breakdowns.reduce(
    (minIdx, b, i) => (b.totalMonthlyCost < breakdowns[minIdx].totalMonthlyCost ? i : minIdx),
    0,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label>프롬프트 캐싱 적용률: {Math.round(apiInputs.cacheRate * 100)}%</Label>
              <Slider
                value={[apiInputs.cacheRate * 100]}
                onValueChange={([v]) => onApiInputsChange({ ...apiInputs, cacheRate: v / 100 })}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-3">
              <Label>Batch API 활용 비율: {Math.round(apiInputs.batchRate * 100)}%</Label>
              <Slider
                value={[apiInputs.batchRate * 100]}
                onValueChange={([v]) => onApiInputsChange({ ...apiInputs, batchRate: v / 100 })}
                max={100}
                step={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <CostBarChart breakdowns={breakdowns} mode="monthly" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">비용 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>모델</TableHead>
                  <TableHead className="text-right">Input (실시간)</TableHead>
                  <TableHead className="text-right">Input (캐시)</TableHead>
                  <TableHead className="text-right">Input (배치)</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">월간 합계</TableHead>
                  <TableHead className="text-right">연간 합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdowns.map((b, i) => (
                  <TableRow key={b.model.slug}>
                    <TableCell className="font-medium">
                      {b.model.name}
                      {i === cheapestIdx && breakdowns.length > 1 && (
                        <Badge variant="secondary" className="ml-2 text-xs">최저</Badge>
                      )}
                      {b.model.type === 'open-source' && (
                        <span className="ml-2 text-xs text-muted-foreground">(셀프호스팅)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCost(b.realtimeInputCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.cachedInputCost + b.batchCachedInputCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.batchInputCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.realtimeOutputCost + b.batchOutputCost)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCost(b.totalMonthlyCost)}</TableCell>
                    <TableCell className="text-right">{formatCost(b.totalAnnualCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        {models.length === 1 ? (
          <Link href={`/explore/${models[0].slug}`} className="text-primary hover:underline">
            이 모델의 성능 분석 보기
          </Link>
        ) : (
          <Link href="/bva" className="text-primary hover:underline">
            BVA 성능 분석 보기
          </Link>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/simulator/api-cost-tab.tsx src/components/simulator/cost-bar-chart.tsx
git commit -m "feat: add API cost tab with bar chart and breakdown table"
```

---

### Task 9: Build Breakeven Tab + Line Chart

**Files:**
- Create: `src/components/simulator/breakeven-tab.tsx`
- Create: `src/components/simulator/breakeven-line-chart.tsx`

- [ ] **Step 1: Create breakeven line chart**

```typescript
// src/components/simulator/breakeven-line-chart.tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts'
import type { IBreakevenChartPoint } from '@/lib/types/simulator'

interface BreakevenLineChartProps {
  readonly chartData: readonly IBreakevenChartPoint[]
  readonly breakevenPoint: number | null
}

export function BreakevenLineChart({ chartData, breakevenPoint }: BreakevenLineChartProps) {
  const formatter = (value: number) => `$${value.toLocaleString()}`
  const xFormatter = (value: number) => value.toLocaleString()

  const breakevenData = breakevenPoint !== null
    ? chartData.find((p) => p.dailyRequests >= breakevenPoint)
    : null

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData as IBreakevenChartPoint[]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="dailyRequests" tickFormatter={xFormatter} className="text-xs" label={{ value: '일 요청 수', position: 'insideBottom', offset: -5 }} />
        <YAxis tickFormatter={formatter} className="text-xs" label={{ value: '월 비용 ($)', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={formatter} labelFormatter={(v) => `일 ${Number(v).toLocaleString()}건`} />
        <Legend />
        <Line type="monotone" dataKey="apiCost" name="API 비용" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="selfHostedCost" name="셀프호스팅 비용" stroke="#ea580c" strokeWidth={2} dot={false} strokeDasharray="8 4" />
        {breakevenData && (
          <ReferenceDot x={breakevenData.dailyRequests} y={breakevenData.apiCost} r={6} fill="#16a34a" stroke="#fff" strokeWidth={2} />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create breakeven tab**

```typescript
// src/components/simulator/breakeven-tab.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BreakevenLineChart } from './breakeven-line-chart'
import { calculateBreakeven } from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { IGpuReference } from '@/lib/types/gpu'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

interface BreakevenTabProps {
  readonly models: readonly IModel[]
  readonly inputs: ISimulatorInputs
  readonly apiInputs: IApiCostInputs
}

function formatCost(cost: number): string {
  return `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BreakevenTab({ models, inputs, apiInputs }: BreakevenTabProps) {
  const [gpus, setGpus] = useState<readonly IGpuReference[]>([])
  const [selectedGpuSlug, setSelectedGpuSlug] = useState<string>('')
  const [hourlyRate, setHourlyRate] = useState(2.0)
  const [gpuCount, setGpuCount] = useState(1)
  const [dailyHours, setDailyHours] = useState(24)
  const [monthlyOverhead, setMonthlyOverhead] = useState(0)

  const ossModels = models.filter((m) => m.type === 'open-source')
  const commercialModels = models.filter((m) => m.type === 'commercial')

  useEffect(() => {
    async function fetchGpus() {
      const res = await fetch('/api/gpu')
      if (!res.ok) return
      const json = await res.json()
      if (json.success) setGpus(json.data)
    }
    fetchGpus()
  }, [])

  // Auto-set hourly rate when GPU changes
  useEffect(() => {
    const gpu = gpus.find((g) => g.slug === selectedGpuSlug)
    if (gpu) setHourlyRate(gpu.cloudHourly)
  }, [selectedGpuSlug, gpus])

  // Auto-calculate GPU count from OSS model VRAM / selected GPU VRAM
  const selectedGpu = gpus.find((g) => g.slug === selectedGpuSlug)
  useEffect(() => {
    if (!selectedGpu || ossModels.length === 0) return
    const maxVram = Math.max(...ossModels.map((m) => m.infrastructure?.vramFp16 ?? 0))
    if (maxVram > 0 && selectedGpu.vram > 0) {
      setGpuCount(Math.ceil(maxVram / selectedGpu.vram))
    }
  }, [selectedGpu, ossModels])

  // Compare against each commercial model (or fallback to first model)
  const comparisonModels = commercialModels.length > 0 ? commercialModels : [models[0]].filter(Boolean)

  const results = useMemo(() => {
    return comparisonModels.map((cm) =>
      calculateBreakeven({
        commercialModel: cm,
        inputs,
        apiCostInputs: apiInputs,
        hourlyRate,
        gpuCount,
        dailyHours,
        monthlyDays: inputs.monthlyDays,
        monthlyOverhead,
      })
    )
  }, [comparisonModels, inputs, apiInputs, hourlyRate, gpuCount, dailyHours, monthlyOverhead])

  // Use first result for the main display
  const result = results[0] ?? null

  if (ossModels.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          OSS 모델을 선택하면 셀프호스팅 비용을 비교할 수 있습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>GPU 모델</Label>
              <Select value={selectedGpuSlug} onValueChange={setSelectedGpuSlug}>
                <SelectTrigger><SelectValue placeholder="GPU 선택" /></SelectTrigger>
                <SelectContent>
                  {gpus.map((gpu) => (
                    <SelectItem key={gpu.slug} value={gpu.slug}>
                      {gpu.name} ({gpu.vram}GB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>시간당 임대 단가</Label>
              <Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>GPU 수량</Label>
              <Input type="number" min={1} max={64} value={gpuCount} onChange={(e) => setGpuCount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>일 가동시간</Label>
              <Input type="number" min={1} max={24} value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>월 부대비용 ($)</Label>
              <Input type="number" min={0} value={monthlyOverhead} onChange={(e) => setMonthlyOverhead(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">API 월간 비용</p>
                <p className="text-2xl font-bold text-blue-600">{formatCost(result.apiMonthlyCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">{comparisonModel.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">셀프호스팅 월간 비용</p>
                <p className="text-2xl font-bold text-orange-600">{formatCost(result.selfHostedMonthlyCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">손익분기점</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.breakevenDailyRequests !== null
                    ? `일 ${result.breakevenDailyRequests.toLocaleString()}건`
                    : '해당 없음'}
                </p>
                {result.breakevenDailyRequests !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    이 이상이면 셀프호스팅이 유리
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <BreakevenLineChart
            chartData={result.chartData}
            breakevenPoint={result.breakevenDailyRequests}
          />

          {ossModels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OSS 모델 인프라 요구사항</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ossModels.map((m) => (
                    <div key={m.slug} className="space-y-1">
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        VRAM: {m.infrastructure?.vramFp16 ?? 'N/A'}GB
                        {m.infrastructure?.minGpu && ` | 권장 GPU: ${m.infrastructure.minGpu}`}
                        {m.infrastructure?.parameters && ` | ${m.infrastructure.parameters}B params`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/simulator/breakeven-tab.tsx src/components/simulator/breakeven-line-chart.tsx
git commit -m "feat: add breakeven tab with line chart and GPU inputs"
```

---

## Chunk 3: Routing Tab + Integration (Tasks 10-12)

### Task 10: Build Routing Tab + Stacked Chart

**Files:**
- Create: `src/components/simulator/routing-tab.tsx`
- Create: `src/components/simulator/routing-stacked-chart.tsx`

- [ ] **Step 1: Create routing stacked chart**

```typescript
// src/components/simulator/routing-stacked-chart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IRoutingResult } from '@/lib/types/simulator'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea']

interface RoutingStackedChartProps {
  readonly result: IRoutingResult
}

export function RoutingStackedChart({ result }: RoutingStackedChartProps) {
  const data = [
    {
      name: '라우팅 적용',
      ...Object.fromEntries(result.perModelCosts.map((c) => [c.modelName, Math.round(c.cost * 100) / 100])),
    },
    {
      name: '단일 모델 (최고가)',
      _baseline: result.baselineMonthlyCost,
    },
  ]

  const formatter = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis tickFormatter={formatter} className="text-xs" />
        <Tooltip formatter={formatter} />
        <Legend />
        {result.perModelCosts.map((c, i) => (
          <Bar key={c.modelName} dataKey={c.modelName} stackId="a" fill={COLORS[i % COLORS.length]} />
        ))}
        <Bar dataKey="_baseline" name="기준 비용" fill="#94a3b8" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create routing tab**

```typescript
// src/components/simulator/routing-tab.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { RoutingStackedChart } from './routing-stacked-chart'
import { calculateRouting } from '@/lib/utils/cost-calculator'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

interface RoutingTabProps {
  readonly models: readonly IModel[]
  readonly inputs: ISimulatorInputs
  readonly apiInputs: IApiCostInputs
  readonly ratios: readonly number[]
  readonly onRatiosChange: (ratios: readonly number[]) => void
}

function formatCost(cost: number): string {
  return `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function RoutingTab({ models, inputs, apiInputs, ratios, onRatiosChange }: RoutingTabProps) {
  const result = useMemo(
    () => calculateRouting({ models, ratios, inputs, apiCostInputs: apiInputs }),
    [models, ratios, inputs, apiInputs],
  )

  if (models.length < 2) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          2개 이상 모델을 선택하면 라우팅 시뮬레이션을 할 수 있습니다.
        </CardContent>
      </Card>
    )
  }

  const handleRatioChange = (index: number, newValue: number) => {
    const newRatio = newValue / 100
    const oldRatio = ratios[index]
    const diff = newRatio - oldRatio

    // Distribute the difference proportionally among other models
    const otherTotal = ratios.reduce((sum, r, i) => (i === index ? sum : sum + r), 0)
    const newRatios = ratios.map((r, i) => {
      if (i === index) return newRatio
      if (otherTotal === 0) return (1 - newRatio) / (ratios.length - 1)
      return Math.max(0, r - (diff * r) / otherTotal)
    })

    // Normalize to exactly 1.0
    const total = newRatios.reduce((sum, r) => sum + r, 0)
    onRatiosChange(newRatios.map((r) => Math.round((r / total) * 100) / 100))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">트래픽 비율 조절</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model, i) => (
              <div key={model.slug} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{model.name}</Label>
                  <span className="text-sm font-medium">{Math.round(ratios[i] * 100)}%</span>
                </div>
                <Slider
                  value={[Math.round(ratios[i] * 100)]}
                  onValueChange={([v]) => handleRatioChange(i, v)}
                  max={100}
                  step={5}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">단일 모델 (최고가)</p>
            <p className="text-2xl font-bold">{formatCost(result.baselineMonthlyCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">라우팅 적용</p>
            <p className="text-2xl font-bold text-blue-600">{formatCost(result.routedMonthlyCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">절감률</p>
            <Badge variant={result.savingsRate > 0 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
              {result.savingsRate}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      <RoutingStackedChart result={result} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/simulator/routing-tab.tsx src/components/simulator/routing-stacked-chart.tsx
git commit -m "feat: add routing tab with traffic ratio sliders and stacked chart"
```

---

### Task 11: Wire Up Simulator Client (Full Integration)

**Files:**
- Modify: `src/components/simulator/simulator-client.tsx`

- [ ] **Step 1: Replace placeholder with full orchestrator**

```typescript
// src/components/simulator/simulator-client.tsx
'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/use-debounce'
import { SimulatorModelSelector } from './model-selector'
import { CommonInputs } from './common-inputs'
import { ApiCostTab } from './api-cost-tab'
import { BreakevenTab } from './breakeven-tab'
import { RoutingTab } from './routing-tab'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

const DEFAULT_INPUTS: ISimulatorInputs = {
  dailyRequests: 1000,
  avgInputTokens: 500,
  avgOutputTokens: 300,
  monthlyDays: 30,
}

const DEFAULT_API_INPUTS: IApiCostInputs = {
  cacheRate: 0,
  batchRate: 0,
}

export function SimulatorClient() {
  const [models, setModels] = useState<readonly IModel[]>([])
  const [inputs, setInputs] = useState<ISimulatorInputs>(DEFAULT_INPUTS)
  const [apiInputs, setApiInputs] = useState<IApiCostInputs>(DEFAULT_API_INPUTS)
  const [ratios, setRatios] = useState<readonly number[]>([])

  // Debounce inputs for 300ms to avoid excessive recalculation (spec requirement)
  const debouncedInputs = useDebounce(inputs, 300)
  const debouncedApiInputs = useDebounce(apiInputs, 300)

  const handleModelsChange = useCallback((newModels: readonly IModel[]) => {
    setModels(newModels)
    // Initialize equal ratios, give remainder to first model
    const count = newModels.length
    if (count > 0) {
      const base = Math.round((1 / count) * 100) / 100
      const remainder = Math.round((1 - base * count) * 100) / 100
      setRatios(newModels.map((_, i) => i === 0 ? base + remainder : base))
    } else {
      setRatios([])
    }
  }, [])

  return (
    <div className="space-y-6">
      <SimulatorModelSelector selectedModels={models} onModelsChange={handleModelsChange} />
      <CommonInputs inputs={inputs} onChange={setInputs} />

      {models.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          모델을 선택하면 비용 시뮬레이션을 시작할 수 있습니다.
        </div>
      ) : (
        <Tabs defaultValue="api-cost">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-cost">API 비용</TabsTrigger>
            <TabsTrigger value="breakeven">손익분기점</TabsTrigger>
            <TabsTrigger value="routing">라우팅</TabsTrigger>
          </TabsList>
          <TabsContent value="api-cost" className="mt-6">
            <ApiCostTab
              models={models}
              inputs={debouncedInputs}
              apiInputs={apiInputs}
              onApiInputsChange={setApiInputs}
            />
          </TabsContent>
          <TabsContent value="breakeven" className="mt-6">
            <BreakevenTab
              models={models}
              inputs={debouncedInputs}
              apiInputs={debouncedApiInputs}
            />
          </TabsContent>
          <TabsContent value="routing" className="mt-6">
            <RoutingTab
              models={models}
              inputs={debouncedInputs}
              apiInputs={debouncedApiInputs}
              ratios={ratios}
              onRatiosChange={setRatios}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/simulator/simulator-client.tsx
git commit -m "feat: wire up simulator client with tabs and state management"
```

---

### Task 12: Final Verification + Integration Tests

**Files:**
- Create: `src/__tests__/components/simulator/simulator.test.tsx`
- Run all tests

- [ ] **Step 1: Write component integration tests**

```typescript
// src/__tests__/components/simulator/simulator.test.tsx
import { render, screen } from '@testing-library/react'
import { SimulatorClient } from '@/components/simulator/simulator-client'

// Mock fetch for model/GPU data
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
) as jest.Mock

describe('SimulatorClient', () => {
  it('shows guidance message when no models selected', () => {
    render(<SimulatorClient />)
    expect(screen.getByText(/모델을 선택하면/)).toBeInTheDocument()
  })

  it('renders model selector', () => {
    render(<SimulatorClient />)
    expect(screen.getByText(/모델 선택/)).toBeInTheDocument()
  })

  it('renders common inputs form', () => {
    render(<SimulatorClient />)
    expect(screen.getByText(/일 평균 요청 수/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run all tests**

Run: `npx jest --verbose 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds, `/simulator` in route list

- [ ] **Step 4: Commit tests**

```bash
git add src/__tests__/components/simulator/simulator.test.tsx
git commit -m "test: add simulator component integration tests"
```

- [ ] **Step 5: Final fix commit (if any fixes needed)**

Stage only the specific files that were fixed, then commit.
