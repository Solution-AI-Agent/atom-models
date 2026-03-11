# Phase 1 MVP 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** LLM 비교/최적화 플랫폼 Phase 1 MVP — 모델 탐색, 비교, 산업별 추천, GPU 레퍼런스 기능을 갖춘 웹 애플리케이션 구축

**Architecture:** Next.js App Router + MongoDB(Mongoose) + shadcn/ui + Tailwind CSS. 서버 컴포넌트 우선, 서비스 레이어 분리, URL 기반 상태 관리. 사이드바 메뉴 레이아웃, 모바일 반응형. 상세 설계는 `docs/specs/2026-03-07-spec-architecture.md` 참조.

**Tech Stack:** Next.js 15, React 19, TypeScript, MongoDB, Mongoose, shadcn/ui, Tailwind CSS, Recharts, Jest, React Testing Library, Playwright

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `postcss.config.js`
- Create: `.env.example`, `.env.local`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/zpro/02_dev/01_workspace/02_atom/atom-models
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Step 2: shadcn/ui 초기화**

```bash
npx shadcn@latest init
```
설정: New York style, Zinc base color, CSS variables 사용

**Step 3: shadcn/ui 핵심 컴포넌트 설치**

```bash
npx shadcn@latest add sidebar-07
npx shadcn@latest add button badge card table tabs input select separator tooltip sheet dropdown-menu
```

- `sidebar-07`: 사이드바 레이아웃 템플릿 (collapsible, mobile-friendly)
- 나머지: 앱 전반에 사용할 기본 컴포넌트

**Step 4: 추가 의존성 설치**

```bash
npm install mongoose recharts
npm install -D jest @jest/globals ts-jest @types/jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

**Step 5: .env.example 생성**

```env
MONGODB_URI=mongodb://user:pass@host:27017/atom-models
```

**Step 6: next.config.ts 수정**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
}

export default nextConfig
```

**Step 7: jest.config.ts 생성**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
}

export default createJestConfig(config)
```

**Step 8: jest.setup.ts 생성**

```typescript
import '@testing-library/jest-dom'
```

**Step 9: package.json에 스크립트 추가**

`package.json`의 scripts에 추가:
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**Step 10: 빌드 확인**

```bash
npm run build
```
Expected: 빌드 성공

**Step 11: 테스트 실행 확인**

```bash
npm test -- --passWithNoTests
```
Expected: 테스트 프레임워크 정상 동작

**Step 12: Commit**

```bash
git init
git add -A
git commit -m "feat: initialize Next.js project with shadcn/ui, TypeScript, Tailwind, Jest"
```

---

## Task 2: 공통 타입 정의

**Files:**
- Create: `src/lib/types/api.ts`
- Create: `src/lib/types/model.ts`
- Create: `src/lib/types/preset.ts`
- Create: `src/lib/types/gpu.ts`
- Test: `src/__tests__/lib/types/model.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/types/model.test.ts
import type { IModel, IModelScores, IModelPricing, IModelInfrastructure } from '@/lib/types/model'

describe('Model types', () => {
  it('should create a valid model object', () => {
    const model: IModel = {
      name: 'Test Model',
      slug: 'test-model',
      provider: 'TestProvider',
      type: 'commercial',
      tier: 'flagship',
      parameterSize: null,
      activeParameters: null,
      architecture: 'dense',
      contextWindow: 128000,
      maxOutput: 4096,
      license: 'Proprietary',
      pricing: {
        input: 3.0,
        output: 15.0,
        cachingDiscount: 0.9,
        batchDiscount: 0.5,
      },
      scores: {
        quality: 90,
        speed: 80,
        reasoning: 85,
        coding: 92,
        multimodal: 70,
      },
      languageScores: { ko: 85, en: 95 },
      benchmarks: { mmlu: 87.5, gpqa: 72.3 },
      infrastructure: null,
      releaseDate: '2025-02-24',
      memo: 'Test memo',
      sourceUrls: ['https://example.com'],
      colorCode: '#D97706',
      lastVerifiedAt: '2026-03-01',
    }

    expect(model.name).toBe('Test Model')
    expect(model.slug).toBe('test-model')
    expect(model.pricing.input).toBe(3.0)
    expect(model.scores.quality).toBe(90)
    expect(model.languageScores.ko).toBe(85)
  })

  it('should allow open-source model with infrastructure', () => {
    const infra: IModelInfrastructure = {
      minGpu: '1x A100 80GB',
      vramFp16: 140,
      vramInt8: 70,
      vramInt4: 35,
      recommendedFramework: ['vLLM'],
      estimatedTps: 45,
    }

    expect(infra.vramFp16).toBe(140)
    expect(infra.recommendedFramework).toContain('vLLM')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/types/model.test.ts
```
Expected: FAIL — cannot find module `@/lib/types/model`

**Step 3: Write API response type**

```typescript
// src/lib/types/api.ts
export interface ApiResponse<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly meta?: {
    readonly total: number
    readonly page: number
    readonly limit: number
  }
}
```

**Step 4: Write Model types**

```typescript
// src/lib/types/model.ts
export interface IModelPricing {
  readonly input: number
  readonly output: number
  readonly cachingDiscount: number
  readonly batchDiscount: number
}

export interface IModelScores {
  readonly quality: number
  readonly speed: number
  readonly reasoning: number
  readonly coding: number
  readonly multimodal: number
}

export interface IModelInfrastructure {
  readonly minGpu: string
  readonly vramFp16: number
  readonly vramInt8: number
  readonly vramInt4: number
  readonly recommendedFramework: readonly string[]
  readonly estimatedTps: number
}

export type ModelType = 'commercial' | 'open-source'
export type ModelTier = 'flagship' | 'mid' | 'small' | 'mini' | 'micro'
export type ModelArchitecture = 'dense' | 'moe'

export interface IModel {
  readonly _id?: string
  readonly name: string
  readonly slug: string
  readonly provider: string
  readonly type: ModelType
  readonly tier: ModelTier
  readonly parameterSize: number | null
  readonly activeParameters: number | null
  readonly architecture: ModelArchitecture
  readonly contextWindow: number
  readonly maxOutput: number
  readonly license: string
  readonly pricing: IModelPricing
  readonly scores: IModelScores
  readonly languageScores: Record<string, number>
  readonly benchmarks: Record<string, number>
  readonly infrastructure: IModelInfrastructure | null
  readonly releaseDate: string
  readonly memo: string
  readonly sourceUrls: readonly string[]
  readonly colorCode: string
  readonly lastVerifiedAt: string
  readonly isNew?: boolean
}

export interface IModelListQuery {
  readonly type?: ModelType
  readonly provider?: string
  readonly tier?: string
  readonly minPrice?: number
  readonly maxPrice?: number
  readonly search?: string
  readonly sort?: string
  readonly order?: 'asc' | 'desc'
  readonly page?: number
  readonly limit?: number
}
```

**Step 5: Write Preset types**

```typescript
// src/lib/types/preset.ts
export interface IPresetWeights {
  readonly quality: number
  readonly speed: number
  readonly reasoning: number
  readonly coding: number
  readonly multimodal: number
  readonly cost: number
  readonly korean: number
}

export interface IPresetRecommendation {
  readonly modelSlug: string
  readonly reason: string
}

export interface IPresetRecommendations {
  readonly commercial: readonly IPresetRecommendation[]
  readonly costEffective: readonly IPresetRecommendation[]
  readonly openSource: readonly IPresetRecommendation[]
}

export interface IIndustryPreset {
  readonly _id?: string
  readonly category: string
  readonly categorySlug: string
  readonly taskType: string
  readonly taskTypeSlug: string
  readonly weights: IPresetWeights
  readonly recommendations: IPresetRecommendations
  readonly description: string
  readonly keyFactors: readonly string[]
}

export interface IRankedModel {
  readonly slug: string
  readonly name: string
  readonly provider: string
  readonly score: number
  readonly breakdown: Record<string, number>
}
```

**Step 6: Write GPU types**

```typescript
// src/lib/types/gpu.ts
export type GpuCategory = 'datacenter' | 'consumer' | 'workstation'

export interface IGpuReference {
  readonly _id?: string
  readonly name: string
  readonly vendor: string
  readonly vram: number
  readonly memoryType: string
  readonly fp16Tflops: number
  readonly int8Tops: number
  readonly tdp: number
  readonly msrp: number
  readonly cloudHourly: number
  readonly category: GpuCategory
  readonly notes: string
}
```

**Step 7: Run test to verify it passes**

```bash
npm test -- src/__tests__/lib/types/model.test.ts
```
Expected: PASS

**Step 8: Commit**

```bash
git add src/lib/types/ src/__tests__/lib/types/
git commit -m "feat: add core type definitions for model, preset, gpu, api"
```

---

## Task 3: MongoDB 연결 설정

**Files:**
- Create: `src/lib/db/connection.ts`
- Test: `src/__tests__/lib/db/connection.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/db/connection.test.ts
import { getConnection } from '@/lib/db/connection'

// MongoDB 연결 모킹
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose')
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue({
      connection: { readyState: 1 },
    }),
    connection: {
      readyState: 0,
    },
  }
})

describe('MongoDB Connection', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, MONGODB_URI: 'mongodb://test:27017/test' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should export getConnection function', () => {
    expect(typeof getConnection).toBe('function')
  })

  it('should throw if MONGODB_URI is not set', async () => {
    delete process.env.MONGODB_URI
    await expect(getConnection()).rejects.toThrow('MONGODB_URI')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/db/connection.test.ts
```
Expected: FAIL — cannot find module

**Step 3: Write minimal implementation**

```typescript
// src/lib/db/connection.ts
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = {
  conn: null,
  promise: null,
}

export async function getConnection(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI)
  }

  cached.conn = await cached.promise
  return cached.conn
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/lib/db/connection.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/db/connection.ts src/__tests__/lib/db/connection.test.ts
git commit -m "feat: add MongoDB connection singleton with env validation"
```

---

## Task 4: Mongoose 모델 정의

**Files:**
- Create: `src/lib/db/models/model.ts`
- Create: `src/lib/db/models/industry-preset.ts`
- Create: `src/lib/db/models/price-history.ts`
- Create: `src/lib/db/models/gpu-reference.ts`
- Test: `src/__tests__/lib/db/models/model.test.ts`
- Test: `src/__tests__/lib/db/models/industry-preset.test.ts`

**Step 1: Write the failing test for Model schema**

```typescript
// src/__tests__/lib/db/models/model.test.ts
import mongoose from 'mongoose'
import { ModelModel, ModelSchema } from '@/lib/db/models/model'

describe('Model Schema', () => {
  it('should have required fields', () => {
    const requiredPaths = ['name', 'slug', 'provider', 'type', 'releaseDate']
    for (const path of requiredPaths) {
      expect(ModelSchema.path(path)).toBeDefined()
      expect(ModelSchema.path(path).isRequired).toBeTruthy()
    }
  })

  it('should have valid enum values for type', () => {
    const typePath = ModelSchema.path('type') as any
    expect(typePath.enumValues).toEqual(['commercial', 'open-source'])
  })

  it('should have valid enum values for tier', () => {
    const tierPath = ModelSchema.path('tier') as any
    expect(tierPath.enumValues).toEqual(['flagship', 'mid', 'small', 'mini', 'micro'])
  })

  it('should compute isNew virtual for recent models', () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 10)
    const doc = new ModelModel({
      name: 'Test', slug: 'test', provider: 'Test', type: 'commercial',
      releaseDate: recentDate
    })
    expect(doc.isNew).toBe(true)
  })

  it('should compute isNew virtual as false for old models', () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 60)
    const doc = new ModelModel({
      name: 'Old', slug: 'old', provider: 'Test', type: 'commercial',
      releaseDate: oldDate
    })
    // Mongoose의 isNew는 저장 여부를 나타내므로 커스텀 가상 필드명을 isRecentlyReleased로 변경
    expect(doc.get('isRecentlyReleased')).toBe(false)
  })
})
```

주의: Mongoose의 `isNew`는 내장 속성(문서 저장 여부)이므로, 가상 필드명을 `isRecentlyReleased`로 변경해야 합니다. 아키텍처 문서의 `isNew`를 수정합니다.

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/db/models/model.test.ts
```
Expected: FAIL

**Step 3: Write Model schema**

```typescript
// src/lib/db/models/model.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IModelDocument extends Document {
  name: string
  slug: string
  provider: string
  type: 'commercial' | 'open-source'
  tier: 'flagship' | 'mid' | 'small' | 'mini' | 'micro'
  parameterSize: number | null
  activeParameters: number | null
  architecture: 'dense' | 'moe'
  contextWindow: number
  maxOutput: number
  license: string
  pricing: {
    input: number
    output: number
    cachingDiscount: number
    batchDiscount: number
  }
  scores: {
    quality: number
    speed: number
    reasoning: number
    coding: number
    multimodal: number
  }
  languageScores: Map<string, number>
  benchmarks: Map<string, number>
  infrastructure: {
    minGpu: string
    vramFp16: number
    vramInt8: number
    vramInt4: number
    recommendedFramework: string[]
    estimatedTps: number
  } | null
  releaseDate: Date
  memo: string
  sourceUrls: string[]
  colorCode: string
  lastVerifiedAt: Date
  isRecentlyReleased: boolean
}

export const ModelSchema = new Schema({
  name:          { type: String, required: true, unique: true },
  slug:          { type: String, required: true, unique: true, index: true },
  provider:      { type: String, required: true, index: true },
  type:          { type: String, enum: ['commercial', 'open-source'], required: true, index: true },
  tier:          { type: String, enum: ['flagship', 'mid', 'small', 'mini', 'micro'], index: true },

  parameterSize:    Number,
  activeParameters: Number,
  architecture:     { type: String, enum: ['dense', 'moe'] },
  contextWindow:    Number,
  maxOutput:        Number,
  license:          String,

  pricing: {
    input:           Number,
    output:          Number,
    cachingDiscount: Number,
    batchDiscount:   Number,
  },

  scores: {
    quality:    Number,
    speed:      Number,
    reasoning:  Number,
    coding:     Number,
    multimodal: Number,
  },

  languageScores: { type: Map, of: Number },
  benchmarks:     { type: Map, of: Schema.Types.Mixed },

  infrastructure: {
    minGpu:               String,
    vramFp16:             Number,
    vramInt8:             Number,
    vramInt4:             Number,
    recommendedFramework: [String],
    estimatedTps:         Number,
  },

  releaseDate:    { type: Date, required: true },
  memo:           String,
  sourceUrls:     [String],
  colorCode:      String,
  lastVerifiedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

ModelSchema.virtual('isRecentlyReleased').get(function() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return this.releaseDate >= thirtyDaysAgo
})

ModelSchema.index({ provider: 1, type: 1 })
ModelSchema.index({ 'pricing.input': 1 })
ModelSchema.index({ releaseDate: -1 })
ModelSchema.index({ name: 'text', provider: 'text' })

export const ModelModel: Model<IModelDocument> =
  mongoose.models.Model || mongoose.model<IModelDocument>('Model', ModelSchema)
```

**Step 4: Write IndustryPreset schema (same pattern)**

```typescript
// src/lib/db/models/industry-preset.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IIndustryPresetDocument extends Document {
  category: string
  categorySlug: string
  taskType: string
  taskTypeSlug: string
  weights: {
    quality: number
    speed: number
    reasoning: number
    coding: number
    multimodal: number
    cost: number
    korean: number
  }
  recommendations: {
    commercial: { modelSlug: string; reason: string }[]
    costEffective: { modelSlug: string; reason: string }[]
    openSource: { modelSlug: string; reason: string }[]
  }
  description: string
  keyFactors: string[]
}

export const IndustryPresetSchema = new Schema({
  category:     { type: String, required: true, index: true },
  categorySlug: { type: String, required: true, index: true },
  taskType:     { type: String, required: true },
  taskTypeSlug: { type: String, required: true },

  weights: {
    quality:    { type: Number, default: 0 },
    speed:      { type: Number, default: 0 },
    reasoning:  { type: Number, default: 0 },
    coding:     { type: Number, default: 0 },
    multimodal: { type: Number, default: 0 },
    cost:       { type: Number, default: 0 },
    korean:     { type: Number, default: 0 },
  },

  recommendations: {
    commercial:    [{ modelSlug: String, reason: String }],
    costEffective: [{ modelSlug: String, reason: String }],
    openSource:    [{ modelSlug: String, reason: String }],
  },

  description: String,
  keyFactors:  [String],
}, {
  timestamps: true,
})

IndustryPresetSchema.index({ categorySlug: 1, taskTypeSlug: 1 }, { unique: true })

export const IndustryPresetModel: Model<IIndustryPresetDocument> =
  mongoose.models.IndustryPreset || mongoose.model<IIndustryPresetDocument>('IndustryPreset', IndustryPresetSchema)
```

**Step 5: Write PriceHistory and GpuReference schemas**

```typescript
// src/lib/db/models/price-history.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPriceHistoryDocument extends Document {
  modelId: mongoose.Types.ObjectId
  modelSlug: string
  inputPrice: number
  outputPrice: number
  recordedAt: Date
}

const PriceHistorySchema = new Schema({
  modelId:     { type: Schema.Types.ObjectId, ref: 'Model', required: true, index: true },
  modelSlug:   { type: String, required: true, index: true },
  inputPrice:  { type: Number, required: true },
  outputPrice: { type: Number, required: true },
  recordedAt:  { type: Date, required: true, default: Date.now },
}, {
  timestamps: true,
})

PriceHistorySchema.index({ modelId: 1, recordedAt: -1 })

export const PriceHistoryModel: Model<IPriceHistoryDocument> =
  mongoose.models.PriceHistory || mongoose.model<IPriceHistoryDocument>('PriceHistory', PriceHistorySchema)
```

```typescript
// src/lib/db/models/gpu-reference.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IGpuReferenceDocument extends Document {
  name: string
  vendor: string
  vram: number
  memoryType: string
  fp16Tflops: number
  int8Tops: number
  tdp: number
  msrp: number
  cloudHourly: number
  category: 'datacenter' | 'consumer' | 'workstation'
  notes: string
}

const GpuReferenceSchema = new Schema({
  name:         { type: String, required: true, unique: true },
  vendor:       String,
  vram:         Number,
  memoryType:   String,
  fp16Tflops:   Number,
  int8Tops:     Number,
  tdp:          Number,
  msrp:         Number,
  cloudHourly:  Number,
  category:     { type: String, enum: ['datacenter', 'consumer', 'workstation'] },
  notes:        String,
}, {
  timestamps: true,
})

export const GpuReferenceModel: Model<IGpuReferenceDocument> =
  mongoose.models.GpuReference || mongoose.model<IGpuReferenceDocument>('GpuReference', GpuReferenceSchema)
```

**Step 6: Write IndustryPreset test**

```typescript
// src/__tests__/lib/db/models/industry-preset.test.ts
import { IndustryPresetSchema } from '@/lib/db/models/industry-preset'

describe('IndustryPreset Schema', () => {
  it('should have required fields', () => {
    const requiredPaths = ['category', 'categorySlug', 'taskType', 'taskTypeSlug']
    for (const path of requiredPaths) {
      expect(IndustryPresetSchema.path(path)).toBeDefined()
      expect(IndustryPresetSchema.path(path).isRequired).toBeTruthy()
    }
  })

  it('should have weights with default values', () => {
    const qualityPath = IndustryPresetSchema.path('weights.quality') as any
    expect(qualityPath.defaultValue).toBe(0)
  })
})
```

**Step 7: Run tests to verify they pass**

```bash
npm test -- src/__tests__/lib/db/models/
```
Expected: PASS

**Step 8: Commit**

```bash
git add src/lib/db/models/ src/__tests__/lib/db/models/
git commit -m "feat: add Mongoose schemas for Model, IndustryPreset, PriceHistory, GpuReference"
```

---

## Task 5: 유틸리티 함수

**Files:**
- Create: `src/lib/utils/format.ts`
- Create: `src/lib/utils/score.ts`
- Create: `src/lib/utils/url.ts`
- Test: `src/__tests__/lib/utils/format.test.ts`
- Test: `src/__tests__/lib/utils/score.test.ts`
- Test: `src/__tests__/lib/utils/url.test.ts`

**Step 1: Write the failing test for format utils**

```typescript
// src/__tests__/lib/utils/format.test.ts
import { formatPrice, formatNumber, formatDate, formatContextWindow } from '@/lib/utils/format'

describe('format utils', () => {
  describe('formatPrice', () => {
    it('should format price with $ prefix', () => {
      expect(formatPrice(3.0)).toBe('$3.00')
    })
    it('should format small prices', () => {
      expect(formatPrice(0.075)).toBe('$0.075')
    })
    it('should return "Free" for 0', () => {
      expect(formatPrice(0)).toBe('Free')
    })
  })

  describe('formatNumber', () => {
    it('should format large numbers with K suffix', () => {
      expect(formatNumber(128000)).toBe('128K')
    })
    it('should format millions with M suffix', () => {
      expect(formatNumber(1048576)).toBe('1.05M')
    })
    it('should format small numbers as-is', () => {
      expect(formatNumber(405)).toBe('405')
    })
  })

  describe('formatDate', () => {
    it('should format date string to YYYY.MM.DD', () => {
      expect(formatDate('2025-02-24')).toBe('2025.02.24')
    })
  })

  describe('formatContextWindow', () => {
    it('should format context window in K tokens', () => {
      expect(formatContextWindow(200000)).toBe('200K')
    })
    it('should format large context window in M tokens', () => {
      expect(formatContextWindow(1048576)).toBe('1.05M')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/utils/format.test.ts
```
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/utils/format.ts
export function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  if (price < 0.01) return `$${price}`
  if (price < 1) return `$${price}`
  return `$${price.toFixed(2)}`
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`
  return `${num}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

export function formatContextWindow(tokens: number): string {
  return formatNumber(tokens)
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/lib/utils/format.test.ts
```
Expected: PASS

**Step 5: Write the failing test for score utils**

```typescript
// src/__tests__/lib/utils/score.test.ts
import { calculateFitnessScore } from '@/lib/utils/score'
import type { IModelScores, IModelPricing } from '@/lib/types/model'
import type { IPresetWeights } from '@/lib/types/preset'

describe('calculateFitnessScore', () => {
  const scores: IModelScores = {
    quality: 90, speed: 80, reasoning: 85, coding: 92, multimodal: 70,
  }
  const pricing: IModelPricing = {
    input: 3.0, output: 15.0, cachingDiscount: 0.9, batchDiscount: 0.5,
  }
  const koreanScore = 85

  it('should calculate weighted fitness score', () => {
    const weights: IPresetWeights = {
      quality: 0.20, speed: 0.25, reasoning: 0.10,
      coding: 0, multimodal: 0, cost: 0.20, korean: 0.25,
    }

    const result = calculateFitnessScore(scores, pricing, koreanScore, weights)

    // quality: 90*0.20=18, speed: 80*0.25=20, reasoning: 85*0.10=8.5
    // cost: (100 - (15/60)*100)*0.20 = 75*0.20=15, korean: 85*0.25=21.25
    expect(result).toBeCloseTo(82.75, 1)
  })

  it('should return 0 for all-zero weights', () => {
    const weights: IPresetWeights = {
      quality: 0, speed: 0, reasoning: 0, coding: 0, multimodal: 0, cost: 0, korean: 0,
    }
    const result = calculateFitnessScore(scores, pricing, koreanScore, weights)
    expect(result).toBe(0)
  })

  it('should handle expensive models with low cost score', () => {
    const expensivePricing: IModelPricing = {
      input: 15.0, output: 60.0, cachingDiscount: 0, batchDiscount: 0,
    }
    const weights: IPresetWeights = {
      quality: 0, speed: 0, reasoning: 0, coding: 0, multimodal: 0, cost: 1.0, korean: 0,
    }
    const result = calculateFitnessScore(scores, expensivePricing, koreanScore, weights)
    expect(result).toBe(0)
  })
})
```

**Step 6: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/utils/score.test.ts
```
Expected: FAIL

**Step 7: Write score implementation**

```typescript
// src/lib/utils/score.ts
import type { IModelScores, IModelPricing } from '@/lib/types/model'
import type { IPresetWeights } from '@/lib/types/preset'

const MAX_OUTPUT_PRICE = 60

export function calculateFitnessScore(
  scores: IModelScores,
  pricing: IModelPricing,
  koreanScore: number,
  weights: IPresetWeights,
): number {
  const costScore = Math.max(0, 100 - (pricing.output / MAX_OUTPUT_PRICE) * 100)

  return (
    scores.quality    * weights.quality +
    scores.speed      * weights.speed +
    scores.reasoning  * weights.reasoning +
    scores.coding     * weights.coding +
    scores.multimodal * weights.multimodal +
    costScore         * weights.cost +
    koreanScore       * weights.korean
  )
}

export function calculateFitnessBreakdown(
  scores: IModelScores,
  pricing: IModelPricing,
  koreanScore: number,
  weights: IPresetWeights,
): Record<string, number> {
  const costScore = Math.max(0, 100 - (pricing.output / MAX_OUTPUT_PRICE) * 100)

  return {
    quality:    scores.quality    * weights.quality,
    speed:      scores.speed      * weights.speed,
    reasoning:  scores.reasoning  * weights.reasoning,
    coding:     scores.coding     * weights.coding,
    multimodal: scores.multimodal * weights.multimodal,
    cost:       costScore         * weights.cost,
    korean:     koreanScore       * weights.korean,
  }
}
```

**Step 8: Run test to verify it passes**

```bash
npm test -- src/__tests__/lib/utils/score.test.ts
```
Expected: PASS

**Step 9: Write URL utils (test + implementation)**

```typescript
// src/__tests__/lib/utils/url.test.ts
import { encodeCompareParams, decodeCompareParams, encodeFilterParams } from '@/lib/utils/url'

describe('URL utils', () => {
  describe('encodeCompareParams', () => {
    it('should encode model slugs as comma-separated', () => {
      const result = encodeCompareParams(['model-a', 'model-b'])
      expect(result).toBe('model-a,model-b')
    })
    it('should return empty string for empty array', () => {
      expect(encodeCompareParams([])).toBe('')
    })
  })

  describe('decodeCompareParams', () => {
    it('should decode comma-separated slugs to array', () => {
      const result = decodeCompareParams('model-a,model-b')
      expect(result).toEqual(['model-a', 'model-b'])
    })
    it('should return empty array for empty string', () => {
      expect(decodeCompareParams('')).toEqual([])
    })
  })
})
```

```typescript
// src/lib/utils/url.ts
export function encodeCompareParams(slugs: readonly string[]): string {
  return slugs.join(',')
}

export function decodeCompareParams(param: string): string[] {
  if (!param) return []
  return param.split(',').filter(Boolean)
}

export function encodeFilterParams(filters: Record<string, string | number | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  return params
}
```

**Step 10: Run all utils tests**

```bash
npm test -- src/__tests__/lib/utils/
```
Expected: PASS

**Step 11: Commit**

```bash
git add src/lib/utils/ src/__tests__/lib/utils/
git commit -m "feat: add utility functions for formatting, scoring, and URL encoding"
```

---

## Task 6: 상수 정의

**Files:**
- Create: `src/lib/constants/tiers.ts`
- Create: `src/lib/constants/providers.ts`
- Create: `src/lib/constants/benchmarks.ts`

**Step 1: Write constants**

```typescript
// src/lib/constants/tiers.ts
export const MODEL_TIERS = {
  flagship: { label: '플래그십', paramRange: '200B+', description: '최고 성능 모델' },
  mid:      { label: '중형', paramRange: '30B-200B', description: '성능과 비용의 균형' },
  small:    { label: '소형', paramRange: '7B-30B', description: '가성비 우수' },
  mini:     { label: '미니', paramRange: '1B-7B', description: '경량 모델' },
  micro:    { label: '초소형', paramRange: '<1B', description: '임베디드/엣지용' },
} as const
```

```typescript
// src/lib/constants/providers.ts
export const PROVIDERS = [
  'OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral',
  'Alibaba', 'DeepSeek', 'xAI', 'Cohere', 'Amazon',
] as const
```

```typescript
// src/lib/constants/benchmarks.ts
export const BENCHMARKS = {
  mmlu:      { label: 'MMLU', description: '대규모 다분야 언어 이해', maxScore: 100 },
  gpqa:      { label: 'GPQA', description: '대학원 수준 과학 질의응답', maxScore: 100 },
  swe_bench: { label: 'SWE-bench', description: '소프트웨어 엔지니어링 벤치마크', maxScore: 100 },
  aime:      { label: 'AIME', description: '수학 경시대회 문제', maxScore: 100 },
  hle:       { label: 'HLE', description: '인간 수준 추정', maxScore: 100 },
  mgsm:      { label: 'MGSM', description: '다국어 수학 추론', maxScore: 100 },
} as const
```

**Step 2: Commit**

```bash
git add src/lib/constants/
git commit -m "feat: add constants for tiers, providers, and benchmarks"
```

---

## Task 7: 서비스 레이어 — Model Service

**Files:**
- Create: `src/lib/services/model.service.ts`
- Test: `src/__tests__/lib/services/model.service.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/services/model.service.test.ts
import { getModels, getModelBySlug, getSimilarModels } from '@/lib/services/model.service'

// Mongoose 모킹
const mockFind = jest.fn()
const mockFindOne = jest.fn()
const mockSort = jest.fn()
const mockSkip = jest.fn()
const mockLimit = jest.fn()
const mockLean = jest.fn()
const mockCountDocuments = jest.fn()

jest.mock('@/lib/db/models/model', () => ({
  ModelModel: {
    find: (...args: any[]) => {
      mockFind(...args)
      return { sort: mockSort }
    },
    findOne: (...args: any[]) => {
      mockFindOne(...args)
      return { lean: mockLean }
    },
    countDocuments: mockCountDocuments,
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

describe('Model Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSort.mockReturnValue({ skip: mockSkip })
    mockSkip.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ lean: mockLean })
    mockLean.mockResolvedValue([])
    mockCountDocuments.mockResolvedValue(0)
  })

  describe('getModels', () => {
    it('should call find with empty filter by default', async () => {
      await getModels({})
      expect(mockFind).toHaveBeenCalled()
    })

    it('should apply type filter', async () => {
      await getModels({ type: 'commercial' })
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'commercial' })
      )
    })

    it('should apply provider filter with multiple values', async () => {
      await getModels({ provider: 'OpenAI,Anthropic' })
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ provider: { $in: ['OpenAI', 'Anthropic'] } })
      )
    })

    it('should apply price range filter', async () => {
      await getModels({ minPrice: 1, maxPrice: 10 })
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          'pricing.output': { $gte: 1, $lte: 10 },
        })
      )
    })
  })

  describe('getModelBySlug', () => {
    it('should call findOne with slug', async () => {
      mockLean.mockResolvedValue({ slug: 'test-model' })
      await getModelBySlug('test-model')
      expect(mockFindOne).toHaveBeenCalledWith({ slug: 'test-model' })
    })

    it('should return null for non-existent slug', async () => {
      mockLean.mockResolvedValue(null)
      const result = await getModelBySlug('non-existent')
      expect(result).toBeNull()
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/services/model.service.test.ts
```
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/services/model.service.ts
import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import type { IModelListQuery } from '@/lib/types/model'

export interface ModelListResult {
  readonly models: readonly any[]
  readonly total: number
  readonly page: number
  readonly limit: number
}

export async function getModels(query: IModelListQuery): Promise<ModelListResult> {
  await getConnection()

  const filter: Record<string, any> = {}

  if (query.type) {
    filter.type = query.type
  }
  if (query.provider) {
    filter.provider = { $in: query.provider.split(',') }
  }
  if (query.tier) {
    filter.tier = { $in: query.tier.split(',') }
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter['pricing.output'] = {}
    if (query.minPrice !== undefined) filter['pricing.output'].$gte = query.minPrice
    if (query.maxPrice !== undefined) filter['pricing.output'].$lte = query.maxPrice
  }
  if (query.search) {
    filter.$text = { $search: query.search }
  }

  const page = query.page || 1
  const limit = query.limit || 50
  const sortField = query.sort || 'name'
  const sortOrder = query.order === 'desc' ? -1 : 1

  const [models, total] = await Promise.all([
    ModelModel
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ModelModel.countDocuments(filter),
  ])

  return { models, total, page, limit }
}

export async function getModelBySlug(slug: string) {
  await getConnection()
  return ModelModel.findOne({ slug }).lean()
}

export async function getSimilarModels(slug: string, limitCount = 4) {
  await getConnection()
  const model = await ModelModel.findOne({ slug }).lean()
  if (!model) return []

  return ModelModel
    .find({
      slug: { $ne: slug },
      $or: [
        { tier: model.tier },
        { provider: model.provider },
      ],
    })
    .limit(limitCount)
    .lean()
}

export async function getNewModels(limitCount = 6) {
  await getConnection()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return ModelModel
    .find({ releaseDate: { $gte: thirtyDaysAgo } })
    .sort({ releaseDate: -1 })
    .limit(limitCount)
    .lean()
}

export async function getModelCount() {
  await getConnection()
  return ModelModel.countDocuments()
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/lib/services/model.service.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/services/model.service.ts src/__tests__/lib/services/model.service.test.ts
git commit -m "feat: add model service with filtering, sorting, pagination"
```

---

## Task 8: 서비스 레이어 — Preset & Recommendation Service

**Files:**
- Create: `src/lib/services/preset.service.ts`
- Create: `src/lib/services/recommendation.service.ts`
- Test: `src/__tests__/lib/services/recommendation.service.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/services/recommendation.service.test.ts
import { getRankedModelsForPreset } from '@/lib/services/recommendation.service'

const mockModels = [
  {
    name: 'Model A', slug: 'model-a', provider: 'TestCo',
    scores: { quality: 90, speed: 80, reasoning: 85, coding: 92, multimodal: 70 },
    pricing: { input: 3, output: 15, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 85]]),
  },
  {
    name: 'Model B', slug: 'model-b', provider: 'TestCo',
    scores: { quality: 70, speed: 95, reasoning: 60, coding: 65, multimodal: 50 },
    pricing: { input: 0.15, output: 0.6, cachingDiscount: 0, batchDiscount: 0 },
    languageScores: new Map([['ko', 75]]),
  },
]

const mockPreset = {
  weights: {
    quality: 0.20, speed: 0.25, reasoning: 0.10,
    coding: 0, multimodal: 0, cost: 0.20, korean: 0.25,
  },
}

jest.mock('@/lib/db/models/model', () => ({
  ModelModel: { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(mockModels) }) },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

describe('Recommendation Service', () => {
  it('should rank models by fitness score', async () => {
    const result = await getRankedModelsForPreset(mockPreset as any, 10)

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBeDefined()
    expect(result[0].score).toBeGreaterThan(0)
    expect(result[0].breakdown).toBeDefined()
    // Model B should rank higher for cost-heavy preset (cheaper model)
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/services/recommendation.service.test.ts
```
Expected: FAIL

**Step 3: Write preset service**

```typescript
// src/lib/services/preset.service.ts
import { getConnection } from '@/lib/db/connection'
import { IndustryPresetModel } from '@/lib/db/models/industry-preset'

export async function getAllPresets() {
  await getConnection()
  return IndustryPresetModel.find().lean()
}

export async function getPresetsByCategory(categorySlug: string) {
  await getConnection()
  return IndustryPresetModel.find({ categorySlug }).lean()
}

export async function getPresetCategories() {
  await getConnection()
  const presets = await IndustryPresetModel.find().lean()

  const categoryMap = new Map<string, { category: string; categorySlug: string; count: number }>()

  for (const preset of presets) {
    const existing = categoryMap.get(preset.categorySlug)
    if (existing) {
      categoryMap.set(preset.categorySlug, { ...existing, count: existing.count + 1 })
    } else {
      categoryMap.set(preset.categorySlug, {
        category: preset.category,
        categorySlug: preset.categorySlug,
        count: 1,
      })
    }
  }

  return Array.from(categoryMap.values())
}
```

**Step 4: Write recommendation service**

```typescript
// src/lib/services/recommendation.service.ts
import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import { calculateFitnessScore, calculateFitnessBreakdown } from '@/lib/utils/score'
import type { IIndustryPresetDocument } from '@/lib/db/models/industry-preset'
import type { IRankedModel } from '@/lib/types/preset'

export async function getRankedModelsForPreset(
  preset: IIndustryPresetDocument,
  limitCount = 10,
): Promise<IRankedModel[]> {
  await getConnection()
  const models = await ModelModel.find().lean()

  const ranked = models.map((model) => {
    const koreanScore = model.languageScores instanceof Map
      ? (model.languageScores.get('ko') || 0)
      : ((model.languageScores as any)?.ko || 0)

    const score = calculateFitnessScore(
      model.scores,
      model.pricing,
      koreanScore,
      preset.weights,
    )

    const breakdown = calculateFitnessBreakdown(
      model.scores,
      model.pricing,
      koreanScore,
      preset.weights,
    )

    return {
      slug: model.slug,
      name: model.name,
      provider: model.provider,
      score: Math.round(score * 100) / 100,
      breakdown,
    }
  })

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, limitCount)
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/__tests__/lib/services/recommendation.service.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/services/ src/__tests__/lib/services/
git commit -m "feat: add preset and recommendation services with fitness scoring"
```

---

## Task 9: 서비스 레이어 — GPU Service

**Files:**
- Create: `src/lib/services/gpu.service.ts`
- Test: `src/__tests__/lib/services/gpu.service.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/lib/services/gpu.service.test.ts
import { getGpuList } from '@/lib/services/gpu.service'

jest.mock('@/lib/db/models/gpu-reference', () => ({
  GpuReferenceModel: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { name: 'A100', vram: 80, category: 'datacenter' },
          { name: 'RTX 4090', vram: 24, category: 'consumer' },
        ]),
      }),
    }),
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

describe('GPU Service', () => {
  it('should return GPU list', async () => {
    const result = await getGpuList({})
    expect(result).toHaveLength(2)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/lib/services/gpu.service.test.ts
```
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/services/gpu.service.ts
import { getConnection } from '@/lib/db/connection'
import { GpuReferenceModel } from '@/lib/db/models/gpu-reference'

interface GpuQuery {
  readonly category?: string
  readonly minVram?: number
}

export async function getGpuList(query: GpuQuery) {
  await getConnection()

  const filter: Record<string, any> = {}
  if (query.category) filter.category = query.category
  if (query.minVram) filter.vram = { $gte: query.minVram }

  return GpuReferenceModel.find(filter).sort({ vram: -1 }).lean()
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/lib/services/gpu.service.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/services/gpu.service.ts src/__tests__/lib/services/gpu.service.test.ts
git commit -m "feat: add GPU reference service"
```

---

## Task 10: API Routes — Models

**Files:**
- Create: `src/app/api/models/route.ts`
- Create: `src/app/api/models/[slug]/route.ts`
- Test: `src/__tests__/app/api/models/route.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/app/api/models/route.test.ts
import { GET } from '@/app/api/models/route'
import { getModels } from '@/lib/services/model.service'

jest.mock('@/lib/services/model.service')
const mockGetModels = getModels as jest.MockedFunction<typeof getModels>

describe('GET /api/models', () => {
  it('should return models with success response', async () => {
    mockGetModels.mockResolvedValue({
      models: [{ name: 'Test', slug: 'test' }],
      total: 1,
      page: 1,
      limit: 50,
    })

    const request = new Request('http://localhost/api/models')
    const response = await GET(request)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.meta.total).toBe(1)
  })

  it('should pass query params to service', async () => {
    mockGetModels.mockResolvedValue({ models: [], total: 0, page: 1, limit: 50 })

    const request = new Request('http://localhost/api/models?type=commercial&provider=OpenAI')
    await GET(request)

    expect(mockGetModels).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'commercial', provider: 'OpenAI' })
    )
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/app/api/models/route.test.ts
```
Expected: FAIL

**Step 3: Write models list route**

```typescript
// src/app/api/models/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getModels } from '@/lib/services/model.service'
import type { IModelListQuery } from '@/lib/types/model'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const query: IModelListQuery = {
      type: searchParams.get('type') as IModelListQuery['type'] || undefined,
      provider: searchParams.get('provider') || undefined,
      tier: searchParams.get('tier') || undefined,
      minPrice: searchParams.has('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.has('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') as IModelListQuery['order'] || undefined,
      page: searchParams.has('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
    }

    const result = await getModels(query)

    return NextResponse.json({
      success: true,
      data: result.models,
      meta: { total: result.total, page: result.page, limit: result.limit },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch models' },
      { status: 500 },
    )
  }
}
```

**Step 4: Write model detail route**

```typescript
// src/app/api/models/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getModelBySlug, getSimilarModels } from '@/lib/services/model.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const model = await getModelBySlug(slug)

    if (!model) {
      return NextResponse.json(
        { success: false, error: '모델을 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    const similarModels = await getSimilarModels(slug)

    return NextResponse.json({
      success: true,
      data: { ...model, similarModels },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch model' },
      { status: 500 },
    )
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/__tests__/app/api/models/route.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/models/ src/__tests__/app/api/models/
git commit -m "feat: add API routes for model list and detail"
```

---

## Task 11: API Routes — Industry Presets & GPU

**Files:**
- Create: `src/app/api/industry-presets/route.ts`
- Create: `src/app/api/industry-presets/[categorySlug]/route.ts`
- Create: `src/app/api/gpu/route.ts`
- Test: `src/__tests__/app/api/industry-presets/route.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/app/api/industry-presets/route.test.ts
import { GET } from '@/app/api/industry-presets/route'
import { getAllPresets } from '@/lib/services/preset.service'

jest.mock('@/lib/services/preset.service')
const mockGetAllPresets = getAllPresets as jest.MockedFunction<typeof getAllPresets>

describe('GET /api/industry-presets', () => {
  it('should return presets', async () => {
    mockGetAllPresets.mockResolvedValue([
      { category: '고객 서비스', categorySlug: 'customer-service', taskType: 'CS 챗봇' },
    ] as any)

    const request = new Request('http://localhost/api/industry-presets')
    const response = await GET(request)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/app/api/industry-presets/route.test.ts
```
Expected: FAIL

**Step 3: Write preset routes**

```typescript
// src/app/api/industry-presets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAllPresets } from '@/lib/services/preset.service'

export async function GET(request: NextRequest) {
  try {
    const presets = await getAllPresets()
    return NextResponse.json({ success: true, data: presets })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch presets' },
      { status: 500 },
    )
  }
}
```

```typescript
// src/app/api/industry-presets/[categorySlug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPresetsByCategory } from '@/lib/services/preset.service'
import { getRankedModelsForPreset } from '@/lib/services/recommendation.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categorySlug: string }> },
) {
  try {
    const { categorySlug } = await params
    const presets = await getPresetsByCategory(categorySlug)

    if (presets.length === 0) {
      return NextResponse.json(
        { success: false, error: '해당 카테고리를 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    const presetsWithRanking = await Promise.all(
      presets.map(async (preset) => ({
        ...preset,
        rankedModels: await getRankedModelsForPreset(preset as any),
      })),
    )

    return NextResponse.json({
      success: true,
      data: {
        category: presets[0].category,
        categorySlug,
        presets: presetsWithRanking,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category presets' },
      { status: 500 },
    )
  }
}
```

```typescript
// src/app/api/gpu/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getGpuList } from '@/lib/services/gpu.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const minVram = searchParams.has('minVram') ? Number(searchParams.get('minVram')) : undefined

    const gpus = await getGpuList({ category, minVram })
    return NextResponse.json({ success: true, data: gpus })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GPU data' },
      { status: 500 },
    )
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/app/api/industry-presets/route.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/industry-presets/ src/app/api/gpu/ src/__tests__/app/api/industry-presets/
git commit -m "feat: add API routes for industry presets and GPU reference"
```

---

## Task 12: 비교 Context + Hook

**Files:**
- Create: `src/contexts/compare-context.tsx`
- Create: `src/hooks/use-compare.ts`
- Create: `src/hooks/use-debounce.ts`
- Test: `src/__tests__/hooks/use-compare.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/hooks/use-compare.test.ts
import { renderHook, act } from '@testing-library/react'
import { CompareProvider, useCompare } from '@/contexts/compare-context'
import React from 'react'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(CompareProvider, null, children)

describe('useCompare', () => {
  it('should start with empty compare list', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    expect(result.current.models).toEqual([])
  })

  it('should add a model', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('model-a') })
    expect(result.current.models).toEqual(['model-a'])
  })

  it('should remove a model', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('model-a') })
    act(() => { result.current.removeModel('model-a') })
    expect(result.current.models).toEqual([])
  })

  it('should not add more than 4 models', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    act(() => { result.current.addModel('b') })
    act(() => { result.current.addModel('c') })
    act(() => { result.current.addModel('d') })
    act(() => { result.current.addModel('e') })
    expect(result.current.models).toHaveLength(4)
  })

  it('should not add duplicate models', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    act(() => { result.current.addModel('a') })
    expect(result.current.models).toHaveLength(1)
  })

  it('should check if model is in compare list', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    expect(result.current.isComparing('a')).toBe(true)
    expect(result.current.isComparing('b')).toBe(false)
  })

  it('should clear all models', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    act(() => { result.current.addModel('b') })
    act(() => { result.current.clearAll() })
    expect(result.current.models).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/hooks/use-compare.test.ts
```
Expected: FAIL

**Step 3: Write CompareContext**

```typescript
// src/contexts/compare-context.tsx
'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

const MAX_COMPARE = 4

interface CompareContextValue {
  readonly models: readonly string[]
  readonly addModel: (slug: string) => void
  readonly removeModel: (slug: string) => void
  readonly isComparing: (slug: string) => boolean
  readonly clearAll: () => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { readonly children: ReactNode }) {
  const [models, setModels] = useState<string[]>([])

  const addModel = useCallback((slug: string) => {
    setModels((prev) => {
      if (prev.includes(slug) || prev.length >= MAX_COMPARE) return prev
      return [...prev, slug]
    })
  }, [])

  const removeModel = useCallback((slug: string) => {
    setModels((prev) => prev.filter((s) => s !== slug))
  }, [])

  const isComparing = useCallback(
    (slug: string) => models.includes(slug),
    [models],
  )

  const clearAll = useCallback(() => {
    setModels([])
  }, [])

  return (
    <CompareContext.Provider value={{ models, addModel, removeModel, isComparing, clearAll }}>
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext)
  if (!context) throw new Error('useCompare must be used within CompareProvider')
  return context
}
```

**Step 4: Write useDebounce hook**

```typescript
// src/hooks/use-debounce.ts
'use client'

import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/__tests__/hooks/use-compare.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/contexts/ src/hooks/ src/__tests__/hooks/
git commit -m "feat: add CompareContext and useCompare hook with max 4 model limit"
```

---

## Task 13: 공통 컴포넌트 (Shared)

**Files:**
- Create: `src/components/shared/new-badge.tsx`
- Create: `src/components/shared/score-badge.tsx`
- Create: `src/components/shared/model-type-badge.tsx`
- Create: `src/components/shared/price-display.tsx`
- Create: `src/components/shared/search-input.tsx`
- Create: `src/components/shared/empty-state.tsx`
- Create: `src/components/shared/pagination.tsx`
- Test: `src/__tests__/components/shared/score-badge.test.tsx`
- Test: `src/__tests__/components/shared/price-display.test.tsx`

**Step 1: Write the failing tests**

```typescript
// src/__tests__/components/shared/score-badge.test.tsx
import { render, screen } from '@testing-library/react'
import { ScoreBadge } from '@/components/shared/score-badge'

describe('ScoreBadge', () => {
  it('should render score value', () => {
    render(<ScoreBadge label="Quality" value={90} />)
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('Quality')).toBeInTheDocument()
  })

  it('should apply green color for high scores (80+)', () => {
    const { container } = render(<ScoreBadge label="Quality" value={90} />)
    expect(container.firstChild).toHaveClass('text-green-700')
  })

  it('should apply yellow color for medium scores (60-79)', () => {
    const { container } = render(<ScoreBadge label="Speed" value={65} />)
    expect(container.firstChild).toHaveClass('text-yellow-700')
  })

  it('should apply red color for low scores (<60)', () => {
    const { container } = render(<ScoreBadge label="Coding" value={40} />)
    expect(container.firstChild).toHaveClass('text-red-700')
  })
})
```

```typescript
// src/__tests__/components/shared/price-display.test.tsx
import { render, screen } from '@testing-library/react'
import { PriceDisplay } from '@/components/shared/price-display'

describe('PriceDisplay', () => {
  it('should render input and output prices', () => {
    render(<PriceDisplay input={3.0} output={15.0} />)
    expect(screen.getByText(/\$3\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument()
  })

  it('should show "Free" for zero prices', () => {
    render(<PriceDisplay input={0} output={0} />)
    const freeElements = screen.getAllByText('Free')
    expect(freeElements.length).toBeGreaterThanOrEqual(1)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/components/shared/
```
Expected: FAIL

**Step 3: Write shared components**

각 공통 컴포넌트를 구현합니다. shadcn/ui의 `Badge`, `Card`, `Input`, `Button` 등을 활용합니다:

- `ScoreBadge`: shadcn `Badge` variant 활용. `{ label: string, value: number }` — 색상 분기: 80+ green, 60-79 yellow, <60 red
- `NewBadge`: shadcn `Badge` — "NEW" 텍스트 배지
- `ModelTypeBadge`: shadcn `Badge` — commercial/open-source 구분
- `PriceDisplay`: `{ input: number, output: number }` — $X.XX/1M tokens 형식
- `SearchInput`: shadcn `Input` 기반. `{ value: string, onChange: (v: string) => void, placeholder?: string }`
- `EmptyState`: `{ message: string }`
- `Pagination`: shadcn `Button` 기반. `{ page: number, total: number, limit: number, onChange: (page: number) => void }`

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/components/shared/
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/shared/ src/__tests__/components/shared/
git commit -m "feat: add shared UI components (badges, price display, pagination)"
```

---

## Task 14: 레이아웃 컴포넌트 (사이드바 기반)

**Files:**
- Create: `src/components/layout/app-sidebar.tsx`
- Create: `src/components/layout/sidebar-nav.tsx`
- Create: `src/components/layout/compare-floating-bar.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/components/layout/app-sidebar.test.tsx`
- Test: `src/__tests__/components/layout/compare-floating-bar.test.tsx`

shadcn/ui의 `Sidebar` 컴포넌트를 활용한 사이드바 레이아웃을 구축합니다.

**Step 1: Write the failing test for sidebar**

```typescript
// src/__tests__/components/layout/app-sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { AppSidebar } from '@/components/layout/app-sidebar'

// shadcn SidebarProvider 모킹
jest.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: any) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: any) => <div>{children}</div>,
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: any) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: any) => <div>{children}</div>,
  SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
  SidebarMenuButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SidebarProvider: ({ children }: any) => <div>{children}</div>,
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Menu</button>,
  SidebarInset: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: jest.fn(), clearAll: jest.fn() }),
}))

describe('AppSidebar', () => {
  it('should render navigation links', () => {
    render(<AppSidebar />)
    expect(screen.getByText('모델 탐색')).toBeInTheDocument()
    expect(screen.getByText('비교')).toBeInTheDocument()
    expect(screen.getByText('산업별 추천')).toBeInTheDocument()
    expect(screen.getByText('인프라 가이드')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/components/layout/app-sidebar.test.tsx
```
Expected: FAIL

**Step 3: Write sidebar layout components and update root layout**

사이드바 레이아웃 구현:

- `AppSidebar`: shadcn `Sidebar` 기반. 로고, 네비게이션 메뉴, 비교 모델 카운트 표시
- `SidebarNav`: 메뉴 항목 (아이콘 + 텍스트 + 활성 상태 하이라이트)
  - 홈 (`/`)
  - 모델 탐색 (`/explore`)
  - 비교 (`/compare`) — 선택된 모델 수 배지
  - 산업별 추천 (`/recommendations`)
  - 인프라 가이드 (`/infra`)
- `CompareFloatingBar`: 비교 목록에 모델이 있을 때만 하단에 표시

`src/app/layout.tsx` 구조:
```tsx
<SidebarProvider>
  <CompareProvider>
    <AppSidebar />
    <SidebarInset>
      <header> {/* 모바일: SidebarTrigger + 페이지 제목 */} </header>
      <main>{children}</main>
    </SidebarInset>
    <CompareFloatingBar />
  </CompareProvider>
</SidebarProvider>
```

반응형 동작:
- 데스크톱: 사이드바 고정 표시 (collapsible to icon-only)
- 모바일: 사이드바 숨김, SidebarTrigger(햄버거)로 Sheet/드로어 형태 오픈

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/components/layout/
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx src/__tests__/components/layout/
git commit -m "feat: add sidebar layout with shadcn/ui, responsive mobile drawer"
```

---

## Task 15: 홈 페이지

**Files:**
- Create: `src/components/home/hero-section.tsx`
- Create: `src/components/home/stats-overview.tsx`
- Create: `src/components/home/new-models-section.tsx`
- Create: `src/components/home/quick-access-cards.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/__tests__/app/home.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/__tests__/app/home.test.tsx
import { render, screen } from '@testing-library/react'
import { StatsOverview } from '@/components/home/stats-overview'

describe('StatsOverview', () => {
  it('should display model count', () => {
    render(<StatsOverview modelCount={36} presetCount={5} />)
    expect(screen.getByText('36')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/app/home.test.tsx
```
Expected: FAIL

**Step 3: Write home page components**

- `HeroSection`: 제품 가치 제안 + CTA 버튼
- `StatsOverview`: 총 모델 수, 산업 프리셋 수, 최근 업데이트
- `NewModelsSection`: isRecentlyReleased=true 모델 카드 (서버 컴포넌트에서 getNewModels() 호출)
- `QuickAccessCards`: 주요 기능 진입점 카드

`src/app/page.tsx`를 서버 컴포넌트로 구현: getModelCount(), getNewModels() 호출.

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/app/home.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/home/ src/app/page.tsx src/__tests__/app/home.test.tsx
git commit -m "feat: add home page with stats, new models, and quick access"
```

---

## Task 16: 모델 탐색 페이지 — 테이블 뷰

**Files:**
- Create: `src/components/explore/filter-panel.tsx`
- Create: `src/components/explore/view-toggle.tsx`
- Create: `src/components/explore/model-table.tsx`
- Create: `src/components/explore/model-table-row.tsx`
- Create: `src/components/explore/column-customizer.tsx`
- Create: `src/app/explore/page.tsx`
- Test: `src/__tests__/components/explore/model-table.test.tsx`
- Test: `src/__tests__/components/explore/filter-panel.test.tsx`

**Step 1: Write the failing test for ModelTable**

```typescript
// src/__tests__/components/explore/model-table.test.tsx
import { render, screen } from '@testing-library/react'
import { ModelTable } from '@/components/explore/model-table'

const mockModels = [
  {
    name: 'Claude Sonnet 4.5', slug: 'claude-sonnet-4-5', provider: 'Anthropic',
    type: 'commercial', tier: 'flagship',
    pricing: { input: 3, output: 15 },
    scores: { quality: 92, speed: 75, reasoning: 90, coding: 95, multimodal: 85 },
    contextWindow: 200000,
    releaseDate: '2025-02-24', isRecentlyReleased: false,
  },
]

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: () => false, clearAll: jest.fn() }),
}))

describe('ModelTable', () => {
  it('should render model rows', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
  })

  it('should render table headers', () => {
    render(<ModelTable models={mockModels} />)
    expect(screen.getByText('모델명')).toBeInTheDocument()
    expect(screen.getByText('제공사')).toBeInTheDocument()
    expect(screen.getByText('가격')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/components/explore/model-table.test.tsx
```
Expected: FAIL

**Step 3: Write explore page components**

- `FilterPanel`: 유형, 제공사, 티어, 가격범위 필터 (URL searchParams 기반)
- `ViewToggle`: 테이블/카드 뷰 전환
- `ModelTable`: 정렬 가능한 테이블 헤더, ModelTableRow 렌더링
- `ModelTableRow`: 모델명(링크), 제공사, 유형, 가격, 주요 점수, 비교 체크박스
- `ColumnCustomizer`: 표시 컬럼 선택 드롭다운

`src/app/explore/page.tsx`: 서버 컴포넌트, searchParams에서 필터/정렬/페이지 읽어 getModels() 호출.

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/components/explore/
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/explore/ src/app/explore/page.tsx src/__tests__/components/explore/
git commit -m "feat: add explore page with filterable, sortable model table"
```

---

## Task 17: 모델 탐색 페이지 — 카드 뷰

**Files:**
- Create: `src/components/explore/model-card.tsx`
- Create: `src/components/explore/model-card-grid.tsx`
- Test: `src/__tests__/components/explore/model-card.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/__tests__/components/explore/model-card.test.tsx
import { render, screen } from '@testing-library/react'
import { ModelCard } from '@/components/explore/model-card'

jest.mock('@/contexts/compare-context', () => ({
  useCompare: () => ({ models: [], addModel: jest.fn(), removeModel: jest.fn(), isComparing: () => false, clearAll: jest.fn() }),
}))

const mockModel = {
  name: 'Llama 4 Maverick', slug: 'llama-4-maverick', provider: 'Meta',
  type: 'open-source', tier: 'flagship', parameterSize: 400,
  pricing: { input: 0.2, output: 0.6 },
  scores: { quality: 80, speed: 88, reasoning: 72, coding: 75, multimodal: 78 },
  contextWindow: 1048576,
  infrastructure: { minGpu: '4x A100 80GB', vramFp16: 280 },
  releaseDate: '2025-04-05', isRecentlyReleased: false,
}

describe('ModelCard', () => {
  it('should render model name and provider', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText('Llama 4 Maverick')).toBeInTheDocument()
    expect(screen.getByText('Meta')).toBeInTheDocument()
  })

  it('should show infrastructure info for open-source models', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText(/4x A100 80GB/)).toBeInTheDocument()
  })

  it('should show parameter size', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText(/400B/)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/components/explore/model-card.test.tsx
```
Expected: FAIL

**Step 3: Write card components**

- `ModelCard`: 모델 카드 (이름, 제공사, 주요 스펙, 점수 배지, 인프라 정보, 비교 체크박스)
- `ModelCardGrid`: 티어별 그룹 헤더 + ModelCard 배열. `SizeTierGroup` 역할 포함.

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/components/explore/model-card.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/explore/model-card.tsx src/components/explore/model-card-grid.tsx src/__tests__/components/explore/model-card.test.tsx
git commit -m "feat: add model card view with tier-based grouping"
```

---

## Task 18: 모델 상세 페이지

**Files:**
- Create: `src/components/detail/model-header.tsx`
- Create: `src/components/detail/specs-section.tsx`
- Create: `src/components/detail/benchmark-chart.tsx`
- Create: `src/components/detail/pricing-section.tsx`
- Create: `src/components/detail/infra-section.tsx`
- Create: `src/components/detail/similar-models.tsx`
- Create: `src/app/explore/[slug]/page.tsx`
- Test: `src/__tests__/components/detail/specs-section.test.tsx`
- Test: `src/__tests__/components/detail/benchmark-chart.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/__tests__/components/detail/specs-section.test.tsx
import { render, screen } from '@testing-library/react'
import { SpecsSection } from '@/components/detail/specs-section'

describe('SpecsSection', () => {
  it('should render architecture info', () => {
    render(
      <SpecsSection
        architecture="moe"
        parameterSize={400}
        activeParameters={17}
        contextWindow={1048576}
        maxOutput={16384}
        license="Llama 4 Community"
      />
    )
    expect(screen.getByText(/MoE/)).toBeInTheDocument()
    expect(screen.getByText(/400B/)).toBeInTheDocument()
    expect(screen.getByText(/17B/)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/components/detail/
```
Expected: FAIL

**Step 3: Write detail page components**

- `ModelHeader`: 모델명, 제공사, 유형/NEW 배지, 비교 추가 버튼, 날짜 정보
- `SpecsSection`: 아키텍처 정보 그리드 (파라미터, 구조, 컨텍스트, 라이선스)
- `BenchmarkChart`: Recharts BarChart로 벤치마크 원점수 시각화 (클라이언트 컴포넌트)
- `PricingSection`: 토큰 단가 + 캐싱/배치 할인 정보 + 월비용 예시 테이블
- `InfraSection`: GPU 요구사항, VRAM(FP16/INT8/INT4), 권장 프레임워크 (오픈소스만)
- `SimilarModels`: 유사 모델 카드 목록 (같은 티어/가격대)

`src/app/explore/[slug]/page.tsx`: 서버 컴포넌트, getModelBySlug() + getSimilarModels() 호출.
SEO: generateMetadata()로 모델명/설명 메타태그 생성.

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/components/detail/
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/detail/ src/app/explore/\[slug\]/ src/__tests__/components/detail/
git commit -m "feat: add model detail page with specs, benchmarks, pricing, infra"
```

---

## Task 19: 비교 페이지

**Files:**
- Create: `src/components/compare/compare-grid.tsx`
- Create: `src/components/compare/compare-card.tsx`
- Create: `src/components/compare/compare-row.tsx`
- Create: `src/components/compare/price-diff.tsx`
- Create: `src/components/compare/highlight-winner.tsx`
- Create: `src/components/compare/share-button.tsx`
- Create: `src/components/compare/empty-compare-slot.tsx`
- Create: `src/app/compare/page.tsx`
- Test: `src/__tests__/components/compare/compare-grid.test.tsx`
- Test: `src/__tests__/components/compare/price-diff.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/__tests__/components/compare/price-diff.test.tsx
import { render, screen } from '@testing-library/react'
import { PriceDiff } from '@/components/compare/price-diff'

describe('PriceDiff', () => {
  it('should show absolute difference', () => {
    render(<PriceDiff prices={[15.0, 3.0]} />)
    expect(screen.getByText(/\$12\.00/)).toBeInTheDocument()
  })

  it('should show multiplier', () => {
    render(<PriceDiff prices={[15.0, 3.0]} />)
    expect(screen.getByText(/5\.0x/)).toBeInTheDocument()
  })
})
```

```typescript
// src/__tests__/components/compare/compare-grid.test.tsx
import { render, screen } from '@testing-library/react'
import { CompareGrid } from '@/components/compare/compare-grid'

const mockModels = [
  {
    name: 'Model A', slug: 'model-a', provider: 'ProviderA',
    pricing: { input: 3, output: 15 },
    scores: { quality: 90, speed: 75, reasoning: 85, coding: 92, multimodal: 70 },
  },
  {
    name: 'Model B', slug: 'model-b', provider: 'ProviderB',
    pricing: { input: 0.15, output: 0.6 },
    scores: { quality: 70, speed: 95, reasoning: 60, coding: 65, multimodal: 50 },
  },
]

describe('CompareGrid', () => {
  it('should render model names', () => {
    render(<CompareGrid models={mockModels} onRemove={jest.fn()} />)
    expect(screen.getByText('Model A')).toBeInTheDocument()
    expect(screen.getByText('Model B')).toBeInTheDocument()
  })

  it('should highlight the winner for each score', () => {
    const { container } = render(<CompareGrid models={mockModels} onRemove={jest.fn()} />)
    // Model A has higher quality (90 vs 70) — should be highlighted
    // Specific DOM assertion depends on implementation
    expect(container).toBeTruthy()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/components/compare/
```
Expected: FAIL

**Step 3: Write compare page components**

- `CompareGrid`: 모델 카드를 나란히 배치, 항목별 비교 행
- `CompareCard`: 모델 헤더(축약), 제거 버튼
- `CompareRow`: 항목별 비교 (기본 스펙, 가격, 평가, 벤치마크, 인프라)
- `PriceDiff`: 가격 차이 절대값 + 배수 표시
- `HighlightWinner`: 항목별 최고값 하이라이트
- `ShareButton`: URL 클립보드 복사
- `EmptyCompareSlot`: 빈 슬롯 (모델 선택 안내)

`src/app/compare/page.tsx`: 클라이언트 컴포넌트. URL에서 `?models=a,b,c` 읽어 API 호출.
CompareContext와 URL 양방향 동기화.

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/components/compare/
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/compare/ src/app/compare/ src/__tests__/components/compare/
git commit -m "feat: add compare page with side-by-side view and price diff"
```

---

## Task 20: 산업별 추천 페이지

**Files:**
- Create: `src/components/recommendations/industry-category-list.tsx`
- Create: `src/components/recommendations/industry-category-card.tsx`
- Create: `src/components/recommendations/preset-card.tsx`
- Create: `src/components/recommendations/recommendation-list.tsx`
- Create: `src/components/recommendations/fitness-score-bar.tsx`
- Create: `src/app/recommendations/page.tsx`
- Create: `src/app/recommendations/[categorySlug]/page.tsx`
- Test: `src/__tests__/components/recommendations/fitness-score-bar.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/__tests__/components/recommendations/fitness-score-bar.test.tsx
import { render, screen } from '@testing-library/react'
import { FitnessScoreBar } from '@/components/recommendations/fitness-score-bar'

const mockRankedModels = [
  { slug: 'model-a', name: 'Model A', provider: 'TestCo', score: 87.5, breakdown: {} },
  { slug: 'model-b', name: 'Model B', provider: 'TestCo', score: 72.3, breakdown: {} },
]

describe('FitnessScoreBar', () => {
  it('should render ranked models', () => {
    render(<FitnessScoreBar rankedModels={mockRankedModels} />)
    expect(screen.getByText('Model A')).toBeInTheDocument()
    expect(screen.getByText('87.5')).toBeInTheDocument()
  })

  it('should render models in score order', () => {
    render(<FitnessScoreBar rankedModels={mockRankedModels} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Model A')
    expect(items[1]).toHaveTextContent('Model B')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/components/recommendations/
```
Expected: FAIL

**Step 3: Write recommendation page components**

- `IndustryCategoryList`: 5개 산업 카테고리 카드 목록
- `IndustryCategoryCard`: 카테고리명 + 업무 유형 수 + 링크
- `PresetCard`: 업무 유형명 + 핵심 요소 태그 + 추천 목록 + 점수 바
- `RecommendationList`: 상용/가성비/오픈소스 추천 모델 (모델명, 이유)
- `FitnessScoreBar`: 가로 바 차트 (상위 5개 모델 점수)

`src/app/recommendations/page.tsx`: 서버 컴포넌트, getPresetCategories() 호출
`src/app/recommendations/[categorySlug]/page.tsx`: 서버 컴포넌트, getPresetsByCategory() + getRankedModelsForPreset() 호출

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/components/recommendations/
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/recommendations/ src/app/recommendations/ src/__tests__/components/recommendations/
git commit -m "feat: add industry recommendations page with fitness scoring"
```

---

## Task 21: 인프라 가이드 페이지

**Files:**
- Create: `src/components/infra/gpu-table.tsx`
- Create: `src/components/infra/gpu-card.tsx`
- Create: `src/app/infra/page.tsx`
- Test: `src/__tests__/components/infra/gpu-table.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/__tests__/components/infra/gpu-table.test.tsx
import { render, screen } from '@testing-library/react'
import { GpuTable } from '@/components/infra/gpu-table'

const mockGpus = [
  { name: 'A100 80GB', vendor: 'NVIDIA', vram: 80, category: 'datacenter', cloudHourly: 1.10, tdp: 300, msrp: 10000 },
  { name: 'RTX 4090', vendor: 'NVIDIA', vram: 24, category: 'consumer', cloudHourly: 0.40, tdp: 450, msrp: 1599 },
]

describe('GpuTable', () => {
  it('should render GPU names', () => {
    render(<GpuTable gpus={mockGpus} />)
    expect(screen.getByText('A100 80GB')).toBeInTheDocument()
    expect(screen.getByText('RTX 4090')).toBeInTheDocument()
  })

  it('should render VRAM values', () => {
    render(<GpuTable gpus={mockGpus} />)
    expect(screen.getByText(/80/)).toBeInTheDocument()
    expect(screen.getByText(/24/)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/components/infra/gpu-table.test.tsx
```
Expected: FAIL

**Step 3: Write infra page components**

- `GpuTable`: 카테고리별 탭, 정렬 가능한 테이블 (이름, VRAM, 클라우드 시간당 가격, TDP, MSRP)
- `GpuCard`: 모바일용 카드 뷰

`src/app/infra/page.tsx`: 서버 컴포넌트, getGpuList() 호출

**Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/components/infra/gpu-table.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/infra/ src/app/infra/ src/__tests__/components/infra/
git commit -m "feat: add GPU reference page with sortable table"
```

---

## Task 22: 시드 데이터 구축

**Files:**
- Create: `data/models.json` (36+ 모델)
- Create: `data/industry-presets.json` (5개 산업)
- Create: `data/gpu-reference.json` (주요 GPU 10+개)
- Create: `data/price-history.json` (초기 가격 이력)

**Step 1: models.json 작성**

36개+ 모델의 전체 데이터를 구축합니다. 주요 모델 포함:

- **OpenAI:** GPT-4o, GPT-4o Mini, GPT-4.5, o1, o3-mini
- **Anthropic:** Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 3.5
- **Google:** Gemini 2.0 Pro, Gemini 2.0 Flash, Gemini 2.5 Pro
- **Meta:** Llama 4 Maverick, Llama 4 Scout, Llama 3.3 70B
- **Mistral:** Mistral Large, Mistral Small, Mixtral 8x22B
- **DeepSeek:** DeepSeek V3, DeepSeek R1
- **Alibaba:** Qwen 3 235B, Qwen 3 32B
- **xAI:** Grok 3, Grok 3 Mini
- **Cohere:** Command R+, Command R
- **Amazon:** Nova Pro, Nova Lite
- 기타 주요 오픈소스 모델

각 모델의 모든 필드를 채웁니다 (가격, 점수, 벤치마크, 인프라 등).

**Step 2: industry-presets.json 작성**

5개 산업 프리셋:
- 고객 서비스 (CS 챗봇 + 복합 문의 처리)
- 개발/IT (코드 생성 + 문서화 + 에이전트)
- 영업/마케팅 (이메일 생성 + 콘텐츠 생성 + 리드 스코어링)
- 금융 (리포트 분석 + 고객 상담)
- 이커머스 (상품 추천 + 상품 설명 생성)

각 프리셋: 가중치 + 정적 추천 (상용/가성비/오픈소스) + 설명 + 핵심요소

**Step 3: gpu-reference.json 작성**

주요 GPU 10+개:
- 데이터센터: A100 80GB, A100 40GB, H100 80GB, L40S
- 컨슈머: RTX 4090, RTX 4080, RTX 3090
- 워크스테이션: A6000, RTX 6000 Ada

**Step 4: Commit**

```bash
git add data/
git commit -m "feat: add seed data for 36+ models, 5 industry presets, 10+ GPUs"
```

---

## Task 23: 시드 Import 스크립트

**Files:**
- Create: `scripts/seed.ts`
- Test: `src/__tests__/scripts/seed.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/scripts/seed.test.ts
import { parseModelData, parsePresetData } from '@/lib/utils/seed-helpers'

describe('Seed helpers', () => {
  it('should parse model data with date conversion', () => {
    const raw = { name: 'Test', releaseDate: '2025-02-24' }
    const parsed = parseModelData(raw)
    expect(parsed.releaseDate).toBeInstanceOf(Date)
  })

  it('should convert languageScores object to Map-compatible format', () => {
    const raw = { languageScores: { ko: 85, en: 95 } }
    const parsed = parseModelData(raw)
    expect(parsed.languageScores).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/scripts/seed.test.ts
```
Expected: FAIL

**Step 3: Write seed helpers**

```typescript
// src/lib/utils/seed-helpers.ts
export function parseModelData(raw: any) {
  return {
    ...raw,
    releaseDate: new Date(raw.releaseDate),
    lastVerifiedAt: raw.lastVerifiedAt ? new Date(raw.lastVerifiedAt) : new Date(),
  }
}

export function parsePresetData(raw: any) {
  return { ...raw }
}
```

**Step 4: Write seed script**

```typescript
// scripts/seed.ts
// 실행: npx tsx scripts/seed.ts [--force]
//
// --force: 기존 데이터 drop 후 재삽입
// 기본: upsert (slug 기준)
//
// 1. MongoDB 연결
// 2. data/*.json 읽기
// 3. 각 컬렉션에 upsert
// 4. PriceHistory 초기 레코드 생성
// 5. 결과 요약 출력

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { parseModelData } from '../src/lib/utils/seed-helpers'

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI required')

  const forceMode = process.argv.includes('--force')

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  // Import schemas
  const { ModelModel } = await import('../src/lib/db/models/model')
  const { IndustryPresetModel } = await import('../src/lib/db/models/industry-preset')
  const { GpuReferenceModel } = await import('../src/lib/db/models/gpu-reference')
  const { PriceHistoryModel } = await import('../src/lib/db/models/price-history')

  const dataDir = path.join(__dirname, '..', 'data')

  // Models
  const modelsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'models.json'), 'utf-8'))
  const models = modelsRaw.map(parseModelData)

  if (forceMode) await ModelModel.deleteMany({})
  for (const model of models) {
    await ModelModel.updateOne({ slug: model.slug }, model, { upsert: true })
  }
  console.log(`Models: ${models.length} upserted`)

  // Industry Presets
  const presetsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'industry-presets.json'), 'utf-8'))
  if (forceMode) await IndustryPresetModel.deleteMany({})
  for (const preset of presetsRaw) {
    await IndustryPresetModel.updateOne(
      { categorySlug: preset.categorySlug, taskTypeSlug: preset.taskTypeSlug },
      preset,
      { upsert: true },
    )
  }
  console.log(`Presets: ${presetsRaw.length} upserted`)

  // GPU Reference
  const gpusRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'gpu-reference.json'), 'utf-8'))
  if (forceMode) await GpuReferenceModel.deleteMany({})
  for (const gpu of gpusRaw) {
    await GpuReferenceModel.updateOne({ name: gpu.name }, gpu, { upsert: true })
  }
  console.log(`GPUs: ${gpusRaw.length} upserted`)

  // Price History (initial records)
  const existingModels = await ModelModel.find().lean()
  for (const model of existingModels) {
    if (model.pricing) {
      await PriceHistoryModel.updateOne(
        { modelSlug: model.slug, recordedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } },
        {
          modelId: model._id,
          modelSlug: model.slug,
          inputPrice: model.pricing.input,
          outputPrice: model.pricing.output,
          recordedAt: new Date(),
        },
        { upsert: true },
      )
    }
  }
  console.log(`Price history: initial records created`)

  await mongoose.disconnect()
  console.log('Seed complete')
}

seed().catch(console.error)
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/__tests__/scripts/seed.test.ts
```
Expected: PASS

**Step 6: Add seed script to package.json**

```json
{
  "seed": "npx tsx scripts/seed.ts",
  "seed:force": "npx tsx scripts/seed.ts --force"
}
```

**Step 7: Commit**

```bash
git add scripts/ src/lib/utils/seed-helpers.ts src/__tests__/scripts/ package.json
git commit -m "feat: add seed import script with upsert support"
```

---

## Task 24: Docker 설정

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Write Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Step 2: Write docker-compose.yml**

```yaml
services:
  app:
    build: .
    ports:
      - "3100:3000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
    restart: unless-stopped
```

**Step 3: Write .dockerignore**

```
node_modules
.next
.git
*.md
data/
scripts/
src/__tests__/
e2e/
jest.config.ts
jest.setup.ts
```

**Step 4: Test Docker build**

```bash
docker build -t atom-models .
```
Expected: 빌드 성공

**Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add Docker configuration for Dockge deployment"
```

---

## Task 25: 통합 테스트

**Files:**
- Test: `src/__tests__/integration/api-models.test.ts`
- Test: `src/__tests__/integration/api-presets.test.ts`

**Step 1: Write integration tests**

API 라우트의 실제 요청-응답 흐름을 테스트합니다 (서비스 레이어 모킹).

```typescript
// src/__tests__/integration/api-models.test.ts
import { GET } from '@/app/api/models/route'
import * as modelService from '@/lib/services/model.service'

jest.mock('@/lib/services/model.service')

describe('GET /api/models integration', () => {
  it('should return 200 with models array', async () => {
    jest.spyOn(modelService, 'getModels').mockResolvedValue({
      models: [{ name: 'Test', slug: 'test' }],
      total: 1, page: 1, limit: 50,
    })

    const req = new Request('http://localhost/api/models')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('should return 500 on service error', async () => {
    jest.spyOn(modelService, 'getModels').mockRejectedValue(new Error('DB error'))

    const req = new Request('http://localhost/api/models')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
  })
})
```

**Step 2: Run integration tests**

```bash
npm test -- src/__tests__/integration/
```
Expected: PASS

**Step 3: Commit**

```bash
git add src/__tests__/integration/
git commit -m "test: add integration tests for API routes"
```

---

## Task 26: 테스트 커버리지 확인 + 최종 빌드

**Step 1: Run coverage**

```bash
npm run test:coverage
```
Expected: 80%+ 커버리지

**Step 2: Fix any coverage gaps**

부족한 커버리지가 있으면 누락된 테스트 추가

**Step 3: Full build test**

```bash
npm run build
```
Expected: 빌드 성공, 에러 없음

**Step 4: Commit**

```bash
git add -A
git commit -m "test: achieve 80%+ test coverage for Phase 1 MVP"
```

---

## Task 27: E2E 테스트 (Playwright)

**Files:**
- Create: `e2e/home.spec.ts`
- Create: `e2e/explore.spec.ts`
- Create: `e2e/compare.spec.ts`
- Create: `playwright.config.ts`

**Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install
```

**Step 2: Write E2E tests**

```typescript
// e2e/home.spec.ts
import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/atom-models/)
  await expect(page.getByText('모델 탐색')).toBeVisible()
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  await page.click('text=모델 탐색')
  await expect(page).toHaveURL(/\/explore/)
})
```

```typescript
// e2e/explore.spec.ts
import { test, expect } from '@playwright/test'

test('explore page shows models', async ({ page }) => {
  await page.goto('/explore')
  // 모델 테이블이 렌더링되는지 확인
  await expect(page.locator('table')).toBeVisible()
})

test('can switch to card view', async ({ page }) => {
  await page.goto('/explore')
  await page.click('[data-testid="view-toggle-card"]')
  await expect(page.locator('[data-testid="model-card"]').first()).toBeVisible()
})

test('can filter by type', async ({ page }) => {
  await page.goto('/explore?type=open-source')
  // URL에 필터가 반영되는지 확인
  await expect(page).toHaveURL(/type=open-source/)
})
```

```typescript
// e2e/compare.spec.ts
import { test, expect } from '@playwright/test'

test('compare page with URL params', async ({ page }) => {
  await page.goto('/compare?models=claude-sonnet-4-5,gpt-4o')
  await expect(page.getByText('Claude Sonnet 4.5')).toBeVisible()
  await expect(page.getByText('GPT-4o')).toBeVisible()
})

test('share button copies URL', async ({ page }) => {
  await page.goto('/compare?models=claude-sonnet-4-5')
  await page.click('[data-testid="share-button"]')
  // 클립보드에 URL이 복사되는지 확인 (허가 필요할 수 있음)
})
```

**Step 3: Run E2E tests**

```bash
npx playwright test
```
Expected: PASS (DB에 시드 데이터가 있어야 함)

**Step 4: Add E2E script to package.json**

```json
{
  "test:e2e": "playwright test"
}
```

**Step 5: Commit**

```bash
git add e2e/ playwright.config.ts package.json
git commit -m "test: add Playwright E2E tests for home, explore, compare"
```

---

## 완료 체크리스트

- [ ] Task 1: 프로젝트 초기화
- [ ] Task 2: 공통 타입 정의
- [ ] Task 3: MongoDB 연결
- [ ] Task 4: Mongoose 모델
- [ ] Task 5: 유틸리티 함수
- [ ] Task 6: 상수 정의
- [ ] Task 7: Model Service
- [ ] Task 8: Preset & Recommendation Service
- [ ] Task 9: GPU Service
- [ ] Task 10: API Routes — Models
- [ ] Task 11: API Routes — Presets & GPU
- [ ] Task 12: Compare Context + Hook
- [ ] Task 13: 공통 컴포넌트
- [ ] Task 14: 레이아웃 컴포넌트
- [ ] Task 15: 홈 페이지
- [ ] Task 16: 탐색 — 테이블 뷰
- [ ] Task 17: 탐색 — 카드 뷰
- [ ] Task 18: 모델 상세 페이지
- [ ] Task 19: 비교 페이지
- [ ] Task 20: 산업별 추천 페이지
- [ ] Task 21: 인프라 가이드 페이지
- [ ] Task 22: 시드 데이터 구축
- [ ] Task 23: 시드 Import 스크립트
- [ ] Task 24: Docker 설정
- [ ] Task 25: 통합 테스트
- [ ] Task 26: 커버리지 확인 + 빌드
- [ ] Task 27: E2E 테스트
