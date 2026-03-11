# DB Schema Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 9개 컬렉션 체계로 DB 스키마를 전면 개편하고, 서비스/API/UI를 신규 스키마에 맞게 업데이트한다.

**Architecture:** Provider 정규화, 벤치마크/가격 별도 컬렉션 분리(+Model 캐시 유지), BVA 4→8차원 확장, tier 3단계 + tags + capabilities 도입. 기존 camelCase 컨벤션 유지.

**Tech Stack:** Next.js (App Router), MongoDB, Mongoose, TypeScript

**Naming Convention:** 아키텍처 문서(v1.5)는 snake_case로 작성되었지만, 코드에서는 기존 camelCase 유지. 매핑: `provider_id` → `providerId`, `input_per_1m` → `inputPer1m` 등.

---

## Phase 1: Foundation (Types + Constants + DB Models)

### Task 1: Type Definitions 업데이트

**Files:**
- Modify: `src/lib/types/model.ts`
- Create: `src/lib/types/provider.ts`
- Modify: `src/lib/types/bva.ts`
- Modify: `src/lib/types/preset.ts`

**Step 1: `src/lib/types/provider.ts` 생성**

```typescript
export type ProviderType = 'commercial' | 'commercial+oss' | 'oss'

export interface IProvider {
  readonly _id: string              // "OPENAI", "ANTHROPIC", ...
  readonly name: string
  readonly nameEn: string
  readonly type: ProviderType
  readonly headquarters?: string
  readonly founded?: number
  readonly website?: string
  readonly apiEndpoint?: string
  readonly description?: string
  readonly colorCode: string
}
```

**Step 2: `src/lib/types/model.ts` 전면 재작성**

주요 변경:
- `BenchmarkKey` 확장: 기존 7개 + `truthfulqa`, `bfcl`, `ifeval`, `ruler` 추가 (11개)
- `ModelTier` 변경: `'flagship' | 'mid' | 'light'` (5→3단계, small/mini/micro 제거)
- `ModelStatus` 추가: `'active' | 'preview' | 'deprecated' | 'scheduled-deprecation'`
- `IModelPricing` 변경: `{ inputPer1m, outputPer1m, pricingType }` (캐시용 간소화)
- `IModelCapabilities` 추가: 9개 boolean 필드 (functionCalling, structuredOutput, streaming, systemPrompt, vision, toolUse, fineTuning, batchApi, thinkingMode)
- 신규 필드 추가: `providerId`, `family`, `variant`, `tags`, `status`, `deprecationDate`, `trainingCutoff`, `languages`, `modalityInput`, `modalityOutput`, `avgTps`, `ttftMs`, `regions`
- 제거: `languageScores`, `colorCode` (→ Provider로 이동)
- `IModelListQuery`에 `tags`, `status` 필터 추가

```typescript
export type BenchmarkKey =
  | 'mmlu' | 'gpqa' | 'swe_bench' | 'aime' | 'hle' | 'mgsm' | 'kmmlu'
  | 'truthfulqa' | 'bfcl' | 'ifeval' | 'ruler'

export type ModelTier = 'flagship' | 'mid' | 'light'
export type ModelStatus = 'active' | 'preview' | 'deprecated' | 'scheduled-deprecation'

export interface IModelPricing {
  readonly inputPer1m: number | null
  readonly outputPer1m: number | null
  readonly pricingType: string
}

export interface IModelCapabilities {
  readonly functionCalling: boolean
  readonly structuredOutput: boolean
  readonly streaming: boolean
  readonly systemPrompt: boolean
  readonly vision: boolean
  readonly toolUse: boolean
  readonly fineTuning: boolean
  readonly batchApi: boolean
  readonly thinkingMode: boolean
}

export interface IModel {
  readonly _id?: string
  readonly name: string
  readonly slug: string
  readonly providerId: string
  readonly family: string | null
  readonly variant: string | null
  readonly type: ModelType
  readonly tier: ModelTier
  readonly tags: readonly string[]
  readonly releaseDate: string
  readonly license: string
  readonly isOpensource: boolean
  readonly status: ModelStatus
  readonly deprecationDate: string | null
  readonly parameterSize: number | null
  readonly activeParameters: number | null
  readonly architecture: ModelArchitecture
  readonly contextWindow: number
  readonly maxOutput: number
  readonly trainingCutoff: string | null
  readonly languages: readonly string[]
  readonly modalityInput: readonly string[]
  readonly modalityOutput: readonly string[]
  readonly capabilities: IModelCapabilities
  readonly pricing: IModelPricing
  readonly benchmarks: Partial<Record<BenchmarkKey, number | null>>
  readonly compliance: IModelCompliance
  readonly avgTps: number | null
  readonly ttftMs: number | null
  readonly regions: readonly string[] | null
  readonly infrastructure: IModelInfrastructure | null
  readonly openRouterModelId?: string
  readonly memo: string
  readonly sourceUrls: readonly string[]
  readonly lastVerifiedAt: string
  readonly isRecentlyReleased?: boolean
}
```

**Step 3: `src/lib/types/bva.ts` 업데이트**

```typescript
// BvaDimensionKey 확장
export type BvaDimensionKey =
  | 'reasoning' | 'korean' | 'coding' | 'knowledge'
  | 'reliability' | 'toolUse' | 'instruction' | 'longContext'
```

**Step 4: `src/lib/types/preset.ts` 업데이트**

```typescript
export interface IPresetWeights {
  readonly reasoning: number
  readonly korean: number
  readonly coding: number
  readonly knowledge: number
  readonly reliability: number
  readonly toolUse: number
  readonly instruction: number
  readonly longContext: number
  readonly cost: number
}
```

`IRankedModel.breakdown` 타입도 자동으로 새 키가 반영됨 (Record<BvaDimensionKey | 'cost', number>).

**Step 5: Verify**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: 타입 오류 다수 발생 (아직 다른 파일들이 미업데이트). 타입 정의 자체에 구문 오류가 없는지만 확인.

**Step 6: Commit**

```bash
git add src/lib/types/
git commit -m "refactor: update type definitions for schema overhaul

- Add IProvider type
- Expand BenchmarkKey (7→11), BvaDimensionKey (4→8)
- Change ModelTier to 3 levels, add ModelStatus
- Add capabilities, modality, tags to IModel
- Expand IPresetWeights to 9 keys"
```

---

### Task 2: Constants 업데이트

**Files:**
- Modify: `src/lib/constants/benchmarks.ts`
- Modify: `src/lib/constants/tiers.ts`
- Modify: `src/lib/constants/bva-dimensions.ts`
- Modify: `src/lib/constants/providers.ts`

**Step 1: `src/lib/constants/benchmarks.ts` — 7→11개**

```typescript
export const BENCHMARKS = {
  mmlu:       { label: 'MMLU',        description: '대학 수준 지식 이해력',     maxScore: 100, category: '지식' },
  gpqa:       { label: 'GPQA',        description: '대학원 수준 과학 추론',     maxScore: 100, category: '추론' },
  swe_bench:  { label: 'SWE-bench',   description: '소프트웨어 엔지니어링',      maxScore: 100, category: '코딩' },
  aime:       { label: 'AIME',        description: '수학 경시대회 추론',        maxScore: 100, category: '추론' },
  hle:        { label: 'HLE',         description: '최고 난이도 추론',          maxScore: 100, category: '추론' },
  mgsm:       { label: 'MGSM',        description: '다국어 수학 추론',          maxScore: 100, category: '한국어' },
  kmmlu:      { label: 'KMMLU',       description: '한국어 지식 이해력',        maxScore: 100, category: '한국어' },
  truthfulqa: { label: 'TruthfulQA',  description: '사실 기반 응답 정확도',      maxScore: 100, category: '신뢰성' },
  bfcl:       { label: 'BFCL',        description: '함수 호출 정확도',          maxScore: 100, category: '도구호출' },
  ifeval:     { label: 'IFEval',      description: '명령어 수행 정확도',        maxScore: 100, category: '명령어수행' },
  ruler:      { label: 'RULER',       description: '롱컨텍스트 성능',           maxScore: 100, category: '긴문서처리' },
} as const
```

**Step 2: `src/lib/constants/tiers.ts` — 5→3단계**

```typescript
export const MODEL_TIERS = {
  flagship: { label: '플래그십', paramRange: '70B+',  description: '최고 성능 모델' },
  mid:      { label: '중형',    paramRange: '7B-70B', description: '성능과 비용의 균형' },
  light:    { label: '경량',    paramRange: '<7B',    description: '가성비/경량 모델' },
} as const
```

**Step 3: `src/lib/constants/bva-dimensions.ts` — 4→8차원**

기존 4개 유지 + 4개 추가:
```typescript
// 기존 배열 끝에 추가
{
  key: 'reliability',
  displayName: '신뢰성',
  description: '환각 방지 및 사실 기반 응답 정확도',
  formula: [{ benchmark: 'truthfulqa', weight: 1.0 }],
  formulaExplanation: '사실 기반 응답 정확도(TruthfulQA 100%)',
},
{
  key: 'toolUse',
  displayName: '도구 호출',
  description: 'Function calling 및 API 활용 능력',
  formula: [{ benchmark: 'bfcl', weight: 1.0 }],
  formulaExplanation: '함수 호출 정확도(BFCL 100%)',
},
{
  key: 'instruction',
  displayName: '명령어 수행',
  description: '프롬프트 지시사항 준수 정확도',
  formula: [{ benchmark: 'ifeval', weight: 1.0 }],
  formulaExplanation: '명령어 수행 정확도(IFEval 100%)',
},
{
  key: 'longContext',
  displayName: '긴 문서 처리',
  description: '롱컨텍스트 환경에서의 성능 유지력',
  formula: [{ benchmark: 'ruler', weight: 1.0 }],
  formulaExplanation: '롱컨텍스트 성능(RULER 100%)',
},
```

**Step 4: `src/lib/constants/providers.ts` 업데이트**

현재 8개 문자열 배열 → Provider ID 매핑 추가:
```typescript
export const PROVIDERS = [
  'OpenAI', 'Anthropic', 'Google', 'xAI',
  'Alibaba', 'DeepSeek', 'Zhipu AI', 'Moonshot AI',
] as const

export const PROVIDER_IDS: Record<string, string> = {
  'OpenAI':      'OPENAI',
  'Anthropic':   'ANTHROPIC',
  'Google':      'GOOGLE',
  'xAI':         'XAI',
  'Alibaba':     'ALIBABA',
  'DeepSeek':    'DEEPSEEK',
  'Zhipu AI':    'ZHIPU',
  'Moonshot AI': 'MOONSHOT',
}
```

**Step 5: Commit**

```bash
git add src/lib/constants/
git commit -m "refactor: update constants for schema overhaul

- Expand BENCHMARKS 7→11 with category field
- Simplify MODEL_TIERS 5→3 levels
- Expand BVA_DIMENSIONS 4→8
- Add PROVIDER_IDS mapping"
```

---

### Task 3: Mongoose Models — 신규 생성

**Files:**
- Create: `src/lib/db/models/provider.ts`
- Create: `src/lib/db/models/model-benchmark.ts`
- Create: `src/lib/db/models/model-pricing.ts`
- Create: `src/lib/db/models/ref-benchmark.ts`

**Step 1: `src/lib/db/models/provider.ts`**

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IProviderDocument extends Document {
  _id: string
  name: string
  nameEn: string
  type: 'commercial' | 'commercial+oss' | 'oss'
  headquarters?: string
  founded?: number
  website?: string
  apiEndpoint?: string
  description?: string
  colorCode: string
}

const ProviderSchema = new Schema<IProviderDocument>(
  {
    _id:          { type: String },
    name:         { type: String, required: true },
    nameEn:       { type: String, required: true },
    type:         { type: String, enum: ['commercial', 'commercial+oss', 'oss'], required: true },
    headquarters: String,
    founded:      Number,
    website:      String,
    apiEndpoint:  String,
    description:  String,
    colorCode:    { type: String, required: true },
  },
  { timestamps: true },
)

export const ProviderModel =
  mongoose.models.Provider as mongoose.Model<IProviderDocument> ??
  mongoose.model<IProviderDocument>('Provider', ProviderSchema, 'providers')
```

**Step 2: `src/lib/db/models/ref-benchmark.ts`**

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IRefBenchmarkDocument extends Document {
  _id: string
  name: string
  displayName: string
  category: string
  maxScore: number
  description: string
  source: string
  url?: string
}

const RefBenchmarkSchema = new Schema<IRefBenchmarkDocument>({
  _id:         { type: String },
  name:        { type: String, required: true },
  displayName: { type: String, required: true },
  category:    { type: String, required: true },
  maxScore:    { type: Number, required: true },
  description: { type: String, required: true },
  source:      { type: String, required: true },
  url:         String,
})

export const RefBenchmarkModel =
  mongoose.models.RefBenchmark as mongoose.Model<IRefBenchmarkDocument> ??
  mongoose.model<IRefBenchmarkDocument>('RefBenchmark', RefBenchmarkSchema, 'ref_benchmarks')
```

**Step 3: `src/lib/db/models/model-benchmark.ts`**

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IModelBenchmarkDocument extends Document {
  modelId: string
  benchmarkId: string
  score: number
  methodology?: string
  source?: string
  measuredDate?: Date
  notes?: string
}

const ModelBenchmarkSchema = new Schema<IModelBenchmarkDocument>(
  {
    modelId:      { type: String, required: true, index: true },
    benchmarkId:  { type: String, required: true, index: true },
    score:        { type: Number, required: true },
    methodology:  String,
    source:       String,
    measuredDate: Date,
    notes:        String,
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

ModelBenchmarkSchema.index(
  { modelId: 1, benchmarkId: 1, measuredDate: -1 },
  { unique: true },
)
ModelBenchmarkSchema.index({ benchmarkId: 1, score: -1 })

export const ModelBenchmarkModel =
  mongoose.models.ModelBenchmark as mongoose.Model<IModelBenchmarkDocument> ??
  mongoose.model<IModelBenchmarkDocument>('ModelBenchmark', ModelBenchmarkSchema, 'model_benchmarks')
```

**Step 4: `src/lib/db/models/model-pricing.ts`**

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IModelPricingDocument extends Document {
  modelId: string
  pricingType: 'api' | 'self-hosted' | 'api-dashscope' | 'api-friendli'
  currency: string
  effectiveFrom: Date
  effectiveTo: Date | null
  inputPer1m: number | null
  outputPer1m: number | null
  cachedInput: number | null
  batchInput: number | null
  batchOutput: number | null
  gpuRequirement: string | null
  costPerHour: number | null
  notes: string | null
}

const ModelPricingSchema = new Schema<IModelPricingDocument>(
  {
    modelId:        { type: String, required: true, index: true },
    pricingType:    { type: String, enum: ['api', 'self-hosted', 'api-dashscope', 'api-friendli'], required: true },
    currency:       { type: String, default: 'USD' },
    effectiveFrom:  { type: Date, required: true },
    effectiveTo:    { type: Date, default: null },
    inputPer1m:     Number,
    outputPer1m:    Number,
    cachedInput:    Number,
    batchInput:     Number,
    batchOutput:    Number,
    gpuRequirement: String,
    costPerHour:    Number,
    notes:          String,
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

ModelPricingSchema.index({ modelId: 1, effectiveFrom: -1 })
ModelPricingSchema.index({ modelId: 1, effectiveTo: 1 })
ModelPricingSchema.index({ pricingType: 1 })

export const ModelPricingModel =
  mongoose.models.ModelPricing as mongoose.Model<IModelPricingDocument> ??
  mongoose.model<IModelPricingDocument>('ModelPricing', ModelPricingSchema, 'model_pricing')
```

**Step 5: Commit**

```bash
git add src/lib/db/models/provider.ts src/lib/db/models/ref-benchmark.ts \
        src/lib/db/models/model-benchmark.ts src/lib/db/models/model-pricing.ts
git commit -m "feat: add new Mongoose models for schema overhaul

- Provider: provider master with full metadata
- RefBenchmark: benchmark definitions (11 benchmarks)
- ModelBenchmark: long-format benchmark scores per model
- ModelPricing: price history with effective_from/to"
```

---

### Task 4: Mongoose Models — 기존 수정

**Files:**
- Modify: `src/lib/db/models/model.ts`
- Modify: `src/lib/db/models/bva-dimension.ts`
- Modify: `src/lib/db/models/industry-preset.ts` → 리네이밍 `bva-preset.ts`
- Delete: `src/lib/db/models/price-history.ts`
- Delete: `src/lib/db/models/benchmark-meta.ts`
- Modify: `src/lib/db/models/gpu-reference.ts` → 리네이밍 `ref-gpu.ts`

**Step 1: `src/lib/db/models/model.ts` 전면 재작성**

주요 변경:
- `provider` (String) → `providerId` (String, ref Provider)
- `tier` enum: `['flagship', 'mid', 'small', 'mini', 'micro']` → `['flagship', 'mid', 'light']`
- 추가 필드: `family`, `variant`, `tags`, `isOpensource`, `status`, `deprecationDate`, `trainingCutoff`, `languages`, `modalityInput`, `modalityOutput`, `capabilities` (embedded), `avgTps`, `ttftMs`, `regions`
- `pricing` 구조 변경: `{ input, output, cachingDiscount, batchDiscount }` → `{ inputPer1m, outputPer1m, pricingType }`
- `benchmarks` Map 유지 (캐시로 사용, 키 11개로 확장)
- 제거: `languageScores`, `colorCode` (Provider로 이동)
- 가상 필드: `isNew` → `isRecentlyReleased` (이미 적용됨)
- 인덱스 추가: `tags`, `status`, `family`, `isOpensource`, `capabilities.functionCalling`, `capabilities.vision`, `modalityInput`, `regions`
- 컬렉션명 변경: 기본값 `models` (변경 없음)

```typescript
// IModelDocument에 추가되는 필드들
providerId: string
family: string | null
variant: string | null
tags: string[]
isOpensource: boolean
status: 'active' | 'preview' | 'deprecated' | 'scheduled-deprecation'
deprecationDate: Date | null
trainingCutoff: Date | null
languages: string[]
modalityInput: string[]
modalityOutput: string[]
capabilities: {
  functionCalling: boolean
  structuredOutput: boolean
  streaming: boolean
  systemPrompt: boolean
  vision: boolean
  toolUse: boolean
  fineTuning: boolean
  batchApi: boolean
  thinkingMode: boolean
}
avgTps: number | null
ttftMs: number | null
regions: string[] | null
// pricing 구조 변경
pricing: {
  inputPer1m: number | null
  outputPer1m: number | null
  pricingType: string
}
```

**중요:** `pricing` 필드명 변경으로 인해 `bva.service.ts`, `recommendation.service.ts`, `score.ts` 등에서 `pricing.input` / `pricing.output` 참조가 깨짐. Phase 3에서 수정.

**Step 2: `src/lib/db/models/industry-preset.ts` → `src/lib/db/models/bva-preset.ts`**

- 파일명 변경
- `IndustryPresetModel` → `BvaPresetModel`
- `IndustryPresetSchema` → `BvaPresetSchema`
- 컬렉션명: `'bva_presets'`
- `weights` 에 4개 키 추가: `reliability`, `toolUse`, `instruction`, `longContext`
- 기존 `categorySlug`, `taskTypeSlug` 유지

**Step 3: `src/lib/db/models/gpu-reference.ts` → `src/lib/db/models/ref-gpu.ts`**

- 파일명 변경
- `GpuReferenceModel` → `RefGpuModel`
- 컬렉션명: `'ref_gpus'`
- 필드 구조는 유지

**Step 4: `src/lib/db/models/bva-dimension.ts` 업데이트**

- 타입에 신규 키 허용 확인 (`key` 필드가 String이라 스키마 변경 불필요)
- 컬렉션명 확인: `'bva_dimensions'`으로 변경 (현재 기본 `bvadimensions` 일 수 있음)

**Step 5: 삭제**

```bash
rm src/lib/db/models/price-history.ts
rm src/lib/db/models/benchmark-meta.ts
```

**Step 6: Verify**

Run: `npx tsc --noEmit 2>&1 | head -100`
Expected: import 참조 오류 다수 (삭제된 파일 참조). Phase 3에서 수정.

**Step 7: Commit**

```bash
git add src/lib/db/models/
git commit -m "refactor: update Mongoose models for schema overhaul

- Model: add providerId, family, variant, tags, capabilities, etc.
- Rename IndustryPreset → BvaPreset
- Rename GpuReference → RefGpu
- Delete PriceHistory, BenchmarkMeta (replaced)"
```

---

### Task 5: DB Models index 파일 업데이트

**Files:**
- Modify or create: `src/lib/db/models/index.ts` (모든 모델 re-export)

모든 import를 새 파일명으로 일괄 변경하기 위한 barrel file:

```typescript
export { ProviderModel } from './provider'
export { ModelModel } from './model'
export { ModelBenchmarkModel } from './model-benchmark'
export { ModelPricingModel } from './model-pricing'
export { RefBenchmarkModel } from './ref-benchmark'
export { RefGpuModel } from './ref-gpu'
export { BvaDimensionModel } from './bva-dimension'
export { BvaPresetModel } from './bva-preset'
export { PlaygroundSessionModel } from './playground-session'
```

**Commit:**

```bash
git add src/lib/db/models/index.ts
git commit -m "refactor: add barrel file for DB models"
```

---

## Phase 2: Seed Data

### Task 6: 시드 데이터 파일 — 참조 데이터

**Files:**
- Create: `data/providers.json`
- Create: `data/ref-benchmarks.json` (기존 `benchmark-meta.json` 대체)
- Modify: `data/bva-dimensions.json` (4→8)
- Rename: `data/gpu-reference.json` → `data/ref-gpus.json`

**Step 1: `data/providers.json` 생성**

8개 프로바이더 마스터 데이터. 각 항목 구조:
```json
[
  {
    "_id": "OPENAI",
    "name": "OpenAI",
    "nameEn": "OpenAI",
    "type": "commercial",
    "headquarters": "San Francisco, USA",
    "founded": 2015,
    "website": "https://openai.com",
    "apiEndpoint": "https://api.openai.com/v1",
    "description": "GPT 시리즈를 개발하는 AI 연구기업",
    "colorCode": "#10A37F"
  }
]
```

`colorCode`는 기존 `data/models.json`의 각 모델 `colorCode` 필드에서 프로바이더별로 추출.

**Step 2: `data/ref-benchmarks.json` 생성**

기존 `data/benchmark-meta.json` (7개) 확장 → 11개. `scoreRange` → `maxScore`, `interpretation` → `description` 통합. 신규 4개 추가:
```json
[
  { "_id": "truthfulqa", "name": "TruthfulQA", "displayName": "사실 기반 응답 정확도", "category": "신뢰성", "maxScore": 100, "description": "모델이 사실에 기반한 응답을 생성하는 정확도. 환각(hallucination) 방지 능력 측정", "source": "University of Oxford" },
  { "_id": "bfcl",       "name": "BFCL",       "displayName": "함수 호출 정확도",      "category": "도구호출", "maxScore": 100, "description": "Function calling의 정확성과 API 파라미터 매핑 능력", "source": "Gorilla LLM" },
  { "_id": "ifeval",     "name": "IFEval",     "displayName": "명령어 수행 정확도",    "category": "명령어수행", "maxScore": 100, "description": "프롬프트 지시사항(포맷, 제약 등)을 정확히 따르는 능력", "source": "Google Research" },
  { "_id": "ruler",      "name": "RULER",      "displayName": "롱컨텍스트 성능",       "category": "긴문서처리", "maxScore": 100, "description": "긴 입력에서 정보 검색, 추론, 요약의 성능 유지력", "source": "NVIDIA" }
]
```

**Step 3: `data/bva-dimensions.json` 확장**

기존 4개 유지 + 4개 추가 (Task 2 Step 3의 상수와 동일 구조).

**Step 4: `data/gpu-reference.json` → `data/ref-gpus.json` 리네이밍**

```bash
mv data/gpu-reference.json data/ref-gpus.json
```

내용은 변경 없음.

**Step 5: Commit**

```bash
git add data/providers.json data/ref-benchmarks.json data/bva-dimensions.json data/ref-gpus.json
git rm data/gpu-reference.json data/benchmark-meta.json
git commit -m "feat: add/update seed data for schema overhaul

- Add providers.json (8 providers)
- Add ref-benchmarks.json (11 benchmarks, replaces benchmark-meta)
- Expand bva-dimensions.json (4→8)
- Rename gpu-reference → ref-gpus"
```

---

### Task 7: 시드 데이터 파일 — 모델 데이터

**Files:**
- Modify: `data/models.json` (50개 모델 전면 재작성)
- Create: `data/model-benchmarks.json`
- Create: `data/model-pricing.json`
- Rename: `data/industry-presets.json` → `data/bva-presets.json`

**Step 1: `data/models.json` 변환**

각 모델에 대해 다음 변환 적용:

1. `provider` → `providerId`: "OpenAI" → "OPENAI" (PROVIDER_IDS 매핑)
2. `tier` 매핑: "small" → "light", "mini" → "light", "micro" → "light"
3. 신규 필드 추가:
   - `family`: 모델명에서 추출 (예: "GPT-5.4 Pro" → family="GPT-5", variant="5.4 Pro")
   - `variant`: 패밀리 내 변형
   - `tags`: 모델 특성에 따라 배열 (예: `["reasoning", "coding"]`)
   - `isOpensource`: `type === 'open-source'`
   - `status`: 기본값 `"active"`
   - `deprecationDate`: null
   - `trainingCutoff`: null (데이터 확보 시 채움)
   - `languages`: 기본 `["en"]`, 한국어 지원 모델은 `["en", "ko", "multi"]`
   - `modalityInput`: `["text"]` (비전 모델은 `["text", "image"]`)
   - `modalityOutput`: `["text"]`
   - `capabilities`: 모델별 boolean 9개 (기본 false, 해당하는 것만 true)
   - `avgTps`: null
   - `ttftMs`: null
   - `regions`: null
4. `pricing` 변환: `{ input, output, cachingDiscount, batchDiscount }` → `{ inputPer1m, outputPer1m, pricingType: "api" }`
5. `benchmarks` 맵에 4개 키 추가 (가용 데이터 있으면 채움, 없으면 null)
6. `colorCode` 제거 (Provider로 이동)
7. `languageScores` 제거

**중요:** 이 작업은 50개 모델 각각에 대해 수동으로 데이터를 조사/입력해야 하는 부분이 있음. 특히:
- `family`/`variant` 분리
- `tags` 배정
- `capabilities` 플래그
- 신규 벤치마크 4개 점수 (truthfulqa, bfcl, ifeval, ruler)

변환 스크립트를 `scripts/migrate-models.ts`로 작성하여 자동화 가능한 부분을 먼저 처리:

```typescript
// scripts/migrate-models.ts
// 기존 models.json을 읽어서 자동 변환 가능한 필드만 처리
// family/variant, tags, capabilities, 신규 벤치마크는 수동 보충 필요
```

**Step 2: `data/model-benchmarks.json` 생성**

기존 `models.json`의 `benchmarks` 맵에서 Long format으로 변환:
```json
[
  {
    "modelId": "claude-4-opus",
    "benchmarkId": "mmlu",
    "score": 90.2,
    "source": "Anthropic 공식",
    "measuredDate": "2026-01-15"
  }
]
```

50개 모델 × 최대 11개 벤치마크 = 최대 550건 (null 제외).

**Step 3: `data/model-pricing.json` 생성**

기존 `models.json`의 `pricing`에서 변환:
```json
[
  {
    "modelId": "claude-4-opus",
    "pricingType": "api",
    "currency": "USD",
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null,
    "inputPer1m": 15.0,
    "outputPer1m": 75.0,
    "cachedInput": 1.5,
    "batchInput": 7.5,
    "batchOutput": 37.5
  }
]
```

`cachedInput`, `batchInput`, `batchOutput`는 기존 `cachingDiscount`, `batchDiscount`에서 계산:
- `cachedInput = inputPer1m * (1 - cachingDiscount)`
- `batchInput = inputPer1m * (1 - batchDiscount)`
- `batchOutput = outputPer1m * (1 - batchDiscount)`

**Step 4: `data/industry-presets.json` → `data/bva-presets.json`**

```bash
mv data/industry-presets.json data/bva-presets.json
```

각 프리셋의 `weights`에 4개 키 추가 (기본 0):
```json
{
  "weights": {
    "reasoning": 25, "korean": 10, "coding": 30, "knowledge": 5,
    "reliability": 5, "toolUse": 10, "instruction": 10, "longContext": 5,
    "cost": 0
  }
}
```

**주의:** 기존 가중치 합계가 100이므로, 신규 4개 추가 시 기존 가중치를 재배분해야 함. 각 프리셋의 업무 특성에 맞게 수동 조정 필요.

**Step 5: `data/price-history.json` 삭제**

```bash
rm data/price-history.json
```

**Step 6: Commit**

```bash
git add data/
git commit -m "feat: rewrite seed data for schema overhaul

- Transform models.json (50 models with new fields)
- Add model-benchmarks.json (long format)
- Add model-pricing.json (with effective dates)
- Rename industry-presets → bva-presets (9 weight keys)
- Remove price-history.json"
```

---

### Task 8: Seed Script 재작성

**Files:**
- Modify: `scripts/seed.ts`
- Modify: `src/lib/utils/seed-helpers.ts` (파싱 로직 업데이트)

**Step 1: `scripts/seed.ts` 재작성**

순서:
1. providers → upsert by `_id`
2. ref_benchmarks → upsert by `_id`
3. ref_gpus → upsert by `slug`
4. models → upsert by `slug`
5. model_benchmarks → upsert by `(modelId, benchmarkId, measuredDate)`
6. model_pricing → upsert by `(modelId, effectiveFrom)`
7. models.benchmarks 캐시 동기화 (model_benchmarks에서 최신 점수 조회 → Model 업데이트)
8. models.pricing 캐시 동기화 (model_pricing에서 effectiveTo=null 조회 → Model 업데이트)
9. bva_dimensions → upsert by `key`
10. bva_presets → upsert by `(categorySlug, taskTypeSlug)`
11. 결과 요약

캐시 동기화 로직:
```typescript
// 벤치마크 캐시 동기화
for (const model of allModels) {
  const benchmarks = await ModelBenchmarkModel.find({ modelId: model.slug })
    .sort({ measuredDate: -1 }).lean()

  const cache: Record<string, number> = {}
  for (const bm of benchmarks) {
    if (!cache[bm.benchmarkId]) {
      cache[bm.benchmarkId] = bm.score
    }
  }

  await ModelModel.updateOne(
    { slug: model.slug },
    { $set: { benchmarks: cache } },
  )
}

// 가격 캐시 동기화
for (const model of allModels) {
  const currentPrice = await ModelPricingModel.findOne({
    modelId: model.slug,
    effectiveTo: null,
  }).lean()

  if (currentPrice) {
    await ModelModel.updateOne(
      { slug: model.slug },
      {
        $set: {
          'pricing.inputPer1m': currentPrice.inputPer1m,
          'pricing.outputPer1m': currentPrice.outputPer1m,
          'pricing.pricingType': currentPrice.pricingType,
        },
      },
    )
  }
}
```

**Step 2: `src/lib/utils/seed-helpers.ts` 업데이트**

`parseModelData` 함수를 새 스키마 필드에 맞게 업데이트. 신규 필드 검증 추가.

**Step 3: Verify — 개발 DB에서 시드 실행**

```bash
MONGODB_URI="mongodb://admin:btc1000K@192.168.219.108:27017/atom-models?authSource=admin" npx tsx scripts/seed.ts --force
```

Expected output:
```
Providers: 8 upserted
RefBenchmarks: 11 upserted
RefGpus: 11 upserted
Models: 50 upserted
ModelBenchmarks: ~400 upserted
ModelPricing: ~50 upserted
BenchmarkCache: 50 synced
PricingCache: 50 synced
BvaDimensions: 8 upserted
BvaPresets: 12 upserted
```

**Step 4: Verify — DB 확인**

```bash
mongosh "mongodb://admin:btc1000K@192.168.219.108:27017/atom-models?authSource=admin" --eval "
  db.providers.countDocuments();
  db.models.countDocuments();
  db.model_benchmarks.countDocuments();
  db.model_pricing.countDocuments();
  db.ref_benchmarks.countDocuments();
  db.ref_gpus.countDocuments();
  db.bva_dimensions.countDocuments();
  db.bva_presets.countDocuments();
"
```

**Step 5: Commit**

```bash
git add scripts/seed.ts src/lib/utils/seed-helpers.ts
git commit -m "refactor: rewrite seed script for schema overhaul

- 10-step seeding: providers → ref data → models → benchmarks → pricing → cache sync → bva
- Add benchmark/pricing cache synchronization
- Remove PriceHistory seeding"
```

---

## Phase 3: Services

### Task 9: score.ts 유틸 업데이트

**Files:**
- Modify: `src/lib/utils/score.ts`

**Step 1: DIMENSION_KEYS 확장**

```typescript
const DIMENSION_KEYS: readonly BvaDimensionKey[] = [
  'reasoning', 'korean', 'coding', 'knowledge',
  'reliability', 'toolUse', 'instruction', 'longContext',
] as const
```

**Step 2: calculateCostScore 시그니처 변경**

기존: `pricing: IModelPricing` (input, output)
신규: `pricing: IModelPricing` (inputPer1m, outputPer1m)

```typescript
export function calculateCostScore(
  pricing: { inputPer1m: number | null; outputPer1m: number | null },
  type: ModelType,
): number {
  if (type === 'open-source') return 100
  const output = pricing.outputPer1m ?? 0
  return Math.max(0, 100 - (output / MAX_OUTPUT_PRICE) * 100)
}
```

**Step 3: calculateFitnessBreakdown 확장**

신규 4개 키 추가:
```typescript
export function calculateFitnessBreakdown(
  dimensionScores: Record<BvaDimensionKey, number | null>,
  costScore: number,
  weights: IPresetWeights,
): Record<BvaDimensionKey | 'cost', number> {
  return {
    reasoning:    (dimensionScores.reasoning ?? 0) * weights.reasoning,
    korean:       (dimensionScores.korean ?? 0) * weights.korean,
    coding:       (dimensionScores.coding ?? 0) * weights.coding,
    knowledge:    (dimensionScores.knowledge ?? 0) * weights.knowledge,
    reliability:  (dimensionScores.reliability ?? 0) * weights.reliability,
    toolUse:      (dimensionScores.toolUse ?? 0) * weights.toolUse,
    instruction:  (dimensionScores.instruction ?? 0) * weights.instruction,
    longContext:  (dimensionScores.longContext ?? 0) * weights.longContext,
    cost:         costScore * weights.cost,
  }
}
```

**Step 4: 테스트**

Run: `npx jest src/__tests__/lib/utils/score.test.ts`
Expected: 일부 테스트 실패 (pricing 구조 변경). 테스트도 함께 업데이트.

**Step 5: Commit**

```bash
git add src/lib/utils/score.ts src/__tests__/lib/utils/score.test.ts
git commit -m "refactor: update score utils for 8 dimensions and new pricing"
```

---

### Task 10: bva.service.ts 업데이트

**Files:**
- Modify: `src/lib/services/bva.service.ts`

**주요 변경:**
1. Import 변경: `BenchmarkMetaModel` → `RefBenchmarkModel`, `IndustryPresetModel` → `BvaPresetModel`
2. `model.pricing.input` / `model.pricing.output` → `model.pricing.inputPer1m` / `model.pricing.outputPer1m`
3. `model.provider` → `model.providerId` (또는 Provider populate)
4. `calculateCostEstimate` 내부: `pricing.input` → `pricing.inputPer1m`
5. `getAllBenchmarkMeta` → `getAllRefBenchmarks`
6. `getPresetCategories`: `IndustryPresetModel` → `BvaPresetModel`

**Step 1: Import 변경**

```typescript
import { RefBenchmarkModel } from '@/lib/db/models/ref-benchmark'
import { BvaPresetModel } from '@/lib/db/models/bva-preset'
// 삭제: import { BenchmarkMetaModel } from ...
// 삭제: import { IndustryPresetModel } from ...
```

**Step 2: generateBvaReport 내부 pricing 참조 변경**

```typescript
// Before:
const costScore = calculateCostScore(model.pricing, model.type as ...)
calculateCostEstimate(model.pricing, model.type, profile.monthlyVolume)

// After: pricing 구조가 { inputPer1m, outputPer1m }로 변경됨
// calculateCostScore는 이미 Task 9에서 시그니처 변경됨
// calculateCostEstimate도 맞춰서 변경:
function calculateCostEstimate(
  pricing: { inputPer1m: number | null; outputPer1m: number | null },
  modelType: string,
  volumeTier: string,
): IBvaCostEstimate | null {
  if (modelType === 'open-source') return null
  const volume = VOLUME_TOKEN_ESTIMATES[volumeTier]
  if (!volume) return null

  const inputCost = (volume.inputTokens / 1_000_000) * (pricing.inputPer1m ?? 0)
  const outputCost = (volume.outputTokens / 1_000_000) * (pricing.outputPer1m ?? 0)
  // ... 나머지 동일
}
```

**Step 3: provider 참조 변경**

ranked model 생성 시 `model.provider` → Provider lookup 필요.
옵션 A: Model에 provider 이름 캐시 유지 → 추가 필드
옵션 B: 쿼리 시 Provider populate

실용적으로 옵션 B 선택:
```typescript
const [models, dimensions, benchmarkMetas] = await Promise.all([
  ModelModel.find().lean(),
  BvaDimensionModel.find().lean(),
  RefBenchmarkModel.find().lean(),
])

// Provider 이름 조회
const providers = await ProviderModel.find().lean()
const providerMap = new Map(providers.map(p => [p._id, p]))

// ranked model 생성 시:
const provider = providerMap.get(model.providerId)
return {
  // ...
  provider: provider?.name ?? model.providerId,
}
```

**Step 4: Commit**

```bash
git add src/lib/services/bva.service.ts
git commit -m "refactor: update bva.service for new schema

- Use RefBenchmarkModel, BvaPresetModel
- Update pricing field references
- Add Provider lookup for model ranking"
```

---

### Task 11: recommendation.service.ts 업데이트

**Files:**
- Modify: `src/lib/services/recommendation.service.ts`

**주요 변경:**
1. Import: `IndustryPresetDocument` → `BvaPresetDocument`
2. `BVA_DIMENSIONS` 상수가 이미 8개로 확장되어 자동 반영
3. `model.provider` → Provider lookup (Task 10과 동일 패턴)
4. `model.pricing` 참조 변경

**Step 1: Import 및 타입 변경**

```typescript
import type { IBvaPresetDocument } from '@/lib/db/models/bva-preset'
// 기존: import type { IIndustryPresetDocument } from ...
```

**Step 2: getRankedModelsForPreset 시그니처**

```typescript
export async function getRankedModelsForPreset(
  preset: IBvaPresetDocument,  // 변경
  limitPerType = 5,
): Promise<IRankedModel[]> {
```

**Step 3: Commit**

```bash
git add src/lib/services/recommendation.service.ts
git commit -m "refactor: update recommendation.service for new schema"
```

---

### Task 12: model.service.ts + preset.service.ts + gpu.service.ts 업데이트

**Files:**
- Modify: `src/lib/services/model.service.ts`
- Modify: `src/lib/services/preset.service.ts`
- Modify: `src/lib/services/gpu.service.ts`

**Step 1: model.service.ts**

- `getModels` 쿼리에 `tags`, `status` 필터 추가
- `provider` 필터 → `providerId` 필터
- 정렬 필드명 변경: `pricing.input` → `pricing.inputPer1m`
- `getSimilarModels`: `model.provider` → `model.providerId`
- Provider populate 또는 별도 조회 추가 (모델 목록에 프로바이더 이름/색상 필요)

**Step 2: preset.service.ts**

- `IndustryPresetModel` → `BvaPresetModel`
- Import 경로 변경

**Step 3: gpu.service.ts**

- `GpuReferenceModel` → `RefGpuModel`
- Import 경로 변경
- 필드명은 동일 (스키마 구조 변경 없음)

**Step 4: Commit**

```bash
git add src/lib/services/model.service.ts src/lib/services/preset.service.ts src/lib/services/gpu.service.ts
git commit -m "refactor: update model/preset/gpu services for new schema"
```

---

### Task 13: provider.service.ts 신규 생성

**Files:**
- Create: `src/lib/services/provider.service.ts`

```typescript
import { getConnection } from '@/lib/db/connection'
import { ProviderModel } from '@/lib/db/models/provider'
import { serialize } from '@/lib/utils/serialize'
import type { IProvider } from '@/lib/types/provider'

export async function getProviders(): Promise<readonly IProvider[]> {
  await getConnection()
  const providers = await ProviderModel.find().lean()
  return serialize(providers)
}

export async function getProviderById(id: string): Promise<IProvider | null> {
  await getConnection()
  const provider = await ProviderModel.findById(id).lean()
  return provider ? serialize(provider) : null
}

export async function getProviderMap(): Promise<ReadonlyMap<string, IProvider>> {
  const providers = await getProviders()
  return new Map(providers.map(p => [p._id, p]))
}
```

**Commit:**

```bash
git add src/lib/services/provider.service.ts
git commit -m "feat: add provider.service for provider queries"
```

---

## Phase 4: API Routes & Components

### Task 14: API Routes 업데이트

**Files:**
- Modify: `src/app/api/models/route.ts`
- Modify: `src/app/api/models/[slug]/route.ts`
- Modify: `src/app/api/bva/route.ts`
- Modify: `src/app/api/industry-presets/` → 경로 유지 (하위 호환) 또는 리다이렉트
- Modify: `src/app/api/gpu/route.ts`

**Step 1: 모든 API route에서 import 경로 업데이트**

`IndustryPresetModel` → `BvaPresetModel`, `GpuReferenceModel` → `RefGpuModel` 등.

**Step 2: 모델 API 응답에 Provider 정보 포함**

```typescript
// GET /api/models
// 모델 목록 응답에 provider name/colorCode 추가
const providerMap = await getProviderMap()
const enriched = models.map(model => ({
  ...model,
  providerName: providerMap.get(model.providerId)?.name ?? model.providerId,
  colorCode: providerMap.get(model.providerId)?.colorCode ?? '#888888',
}))
```

**Step 3: 쿼리 파라미터 업데이트**

`provider` → `providerId` 필터 (또는 둘 다 지원).

**Step 4: Commit**

```bash
git add src/app/api/
git commit -m "refactor: update API routes for new schema"
```

---

### Task 15: 컴포넌트 업데이트 — 필드 참조 변경

**Files:** 아래 grep으로 영향받는 컴포넌트 식별

```bash
grep -rl "pricing\.input\b\|pricing\.output\b\|\.provider\b\|\.tier\b\|colorCode\|languageScores" src/components/
```

**주요 변경 패턴:**

| 기존 참조 | 신규 참조 | 영향 범위 |
|-----------|-----------|-----------|
| `model.pricing.input` | `model.pricing.inputPer1m` | 가격 표시 컴포넌트 |
| `model.pricing.output` | `model.pricing.outputPer1m` | 가격 표시, 비교, BVA |
| `model.provider` | `model.providerId` + Provider lookup | 모델 카드, 테이블, 상세 |
| `model.colorCode` | Provider에서 조회 | 차트, 카드 배지 |
| `model.tier` values | `'small'|'mini'|'micro'` → `'light'` | 필터, 카드 그룹핑 |
| `model.languageScores` | 제거 (미사용이었음) | 해당 없음 |

**Step 1: 가격 관련 컴포넌트**

영향 파일:
- `src/components/explore/model-table-row.tsx`
- `src/components/explore/model-card.tsx`
- `src/components/detail/pricing-section.tsx`
- `src/components/detail/similar-models.tsx`
- `src/components/compare/compare-row.tsx`
- `src/components/home/new-models-section.tsx`

모든 `pricing.input` → `pricing.inputPer1m`, `pricing.output` → `pricing.outputPer1m` 치환.

**Step 2: Provider 관련 컴포넌트**

Provider 이름과 colorCode를 사용하는 컴포넌트에서는 두 가지 접근:

A. **서버 컴포넌트**: 서비스 레이어에서 Provider populate 하여 전달
B. **클라이언트 컴포넌트**: API 응답에 `providerName`, `colorCode` 포함 (Task 14에서 처리)

**Step 3: Tier 필터 컴포넌트**

- `src/components/explore/filter-panel.tsx`: tier 옵션 5개 → 3개
- `MODEL_TIERS` 상수 참조하는 곳 모두 업데이트

**Step 4: BVA 컴포넌트**

- `src/components/bva/bva-dimension-comparison.tsx`: 8개 차원 표시 (기존 4개)
- BVA 입력 폼: 가중치 슬라이더 9개로 확장 (필요시)

**Step 5: Verify**

```bash
npm run build
```

Expected: 빌드 성공

**Step 6: Commit**

```bash
git add src/components/
git commit -m "refactor: update components for new schema

- pricing.input → pricing.inputPer1m
- provider → providerId + Provider lookup
- tier options 5→3
- BVA dimensions 4→8"
```

---

### Task 16: Playground 호환성 확인

**Files:**
- Verify: `src/lib/services/playground.service.ts`
- Verify: `src/lib/services/openrouter.service.ts`
- Verify: `src/components/playground/`

**체크리스트:**
- [ ] PlaygroundSession 스키마: `modelId` ObjectId ref는 유지 (변경 없음)
- [ ] `openRouterModelId` 필드 유지 확인
- [ ] 세션 생성 시 `model.provider` → Provider lookup 필요한 곳 확인
- [ ] 메트릭 계산 (`estimatedCost`)에서 `pricing.input/output` 참조 변경

Playground은 스키마 변경 영향이 최소화되도록 설계. 주요 확인점만 점검.

**Commit:** (변경 있을 시)

```bash
git add src/lib/services/playground.service.ts src/components/playground/
git commit -m "fix: update playground for new pricing field names"
```

---

## Phase 5: Tests & Verification

### Task 17: 테스트 업데이트

**Files:**
- Modify: `src/__tests__/lib/utils/score.test.ts`
- Modify: `src/__tests__/lib/services/model.service.test.ts`
- Modify: `src/__tests__/lib/services/recommendation.service.test.ts`
- Modify: all test files referencing old field names

**Step 1: score.test.ts**

- `IModelPricing` mock: `{ input, output }` → `{ inputPer1m, outputPer1m }`
- breakdown 테스트: 8개 키 확인
- DIMENSION_KEYS: 8개 확인

**Step 2: model.service.test.ts**

- Mock 모델 데이터를 새 스키마에 맞게 업데이트
- `provider` → `providerId`
- `tier` 값 5→3 단계

**Step 3: recommendation.service.test.ts**

- `IndustryPresetModel` → `BvaPresetModel`
- 가중치 mock: 9개 키

**Step 4: Run all tests**

```bash
npx jest --passWithNoTests
```

**Step 5: Commit**

```bash
git add src/__tests__/
git commit -m "test: update tests for schema overhaul"
```

---

### Task 18: 빌드 검증 + 개발 서버 테스트

**Step 1: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

**Step 2: 빌드**

```bash
npm run build
```

Expected: 빌드 성공

**Step 3: 개발 서버 기능 테스트**

```bash
npm run dev
```

수동 확인:
- [ ] `/` 홈: 최근 모델 표시
- [ ] `/explore` 모델 탐색: 테이블/카드 정상, 필터 작동 (3단계 tier)
- [ ] `/explore/[slug]` 상세: 전체 스펙, 벤치마크, 가격 표시
- [ ] `/compare` 비교: 가격/스펙 비교 정상
- [ ] `/bva` BVA: 8차원 평가, 랭킹 정상
- [ ] `/recommendations` 산업별 추천: 프리셋 로딩, 추천 표시
- [ ] `/playground` Playground: 모델 선택, 채팅 정상
- [ ] `/infra` GPU 가이드: GPU 목록 표시

**Step 4: 최종 Commit**

```bash
git add -A
git commit -m "chore: final adjustments for schema overhaul"
```

---

## Summary

| Phase | Tasks | 예상 파일 수 |
|-------|-------|-------------|
| 1. Foundation | 1~5 | ~15 |
| 2. Seed Data | 6~8 | ~10 |
| 3. Services | 9~13 | ~8 |
| 4. API & Components | 14~16 | ~20 |
| 5. Tests & Verification | 17~18 | ~5 |
| **Total** | **18 tasks** | **~58 files** |

**Risk:** Task 7 (모델 데이터 변환)이 가장 시간 소요가 큼. 50개 모델의 family/variant 분리, tags 배정, capabilities 플래그, 신규 벤치마크 데이터 수집이 필요. 변환 스크립트로 자동화 가능한 부분을 먼저 처리하고, 나머지는 수동 보충.
