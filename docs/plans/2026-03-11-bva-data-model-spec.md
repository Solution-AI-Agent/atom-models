# BVA 데이터 모델 상세 설계서

> Task #1 산출물 | 작성: T1 Architect | 2026-03-11

## 1. Model 스키마 변경

### 1.1 제거: IModelScores

```typescript
// src/lib/types/model.ts — 삭제 대상
export interface IModelScores {
  readonly quality: number
  readonly speed: number
  readonly reasoning: number
  readonly coding: number
  readonly multimodal: number
}
```

**IModel에서 `scores: IModelScores` 필드 제거.** 자체 점수는 고객에게 근거를 제시할 수 없으므로 벤치마크 기반으로 전환한다.

### 1.2 신규: IModelCompliance

```typescript
// src/lib/types/model.ts — 추가
export interface IModelCompliance {
  readonly soc2: boolean
  readonly hipaa: boolean
  readonly gdpr: boolean
  readonly onPremise: boolean
  readonly dataExclusion: boolean
}
```

정량화 불가 항목은 점수가 아닌 조건 충족 여부(boolean)로 관리한다.

### 1.3 변경 후 IModel 인터페이스

```typescript
// src/lib/types/model.ts — 변경 후 전체
export interface IModelPricing {
  readonly input: number
  readonly output: number
  readonly cachingDiscount: number
  readonly batchDiscount: number
}

export interface IModelCompliance {
  readonly soc2: boolean
  readonly hipaa: boolean
  readonly gdpr: boolean
  readonly onPremise: boolean
  readonly dataExclusion: boolean
}

export interface IModelInfrastructure {
  readonly minGpu: string
  readonly vramFp16: number
  readonly vramFp8?: number
  readonly vramInt8: number
  readonly vramInt4: number
  readonly vramQ6k?: number
  readonly vramQ5k?: number
  readonly vramQ4kM?: number
  readonly vramQ3k?: number
  readonly vramQ2k?: number
  readonly recommendedFramework: readonly string[]
  readonly estimatedTps: number
}

export type BenchmarkKey =
  | 'mmlu' | 'gpqa' | 'swe_bench' | 'aime' | 'hle' | 'mgsm'   // 기존 6개
  | 'kmmlu' | 'kobest' | 'truthfulqa' | 'halueval'              // 신규 4개

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
  // scores 제거됨
  readonly compliance: IModelCompliance
  readonly languageScores: Record<string, number>
  readonly benchmarks: Partial<Record<BenchmarkKey, number | null>>
  readonly infrastructure: IModelInfrastructure | null
  readonly releaseDate: string
  readonly memo: string
  readonly sourceUrls: readonly string[]
  readonly colorCode: string
  readonly lastVerifiedAt: string
  readonly isRecentlyReleased?: boolean
}
```

**핵심 변경점:**
- `scores` 필드 삭제
- `compliance: IModelCompliance` 추가
- `BenchmarkKey` 유니온 타입으로 벤치마크 키 명시
- `benchmarks` 타입을 `Partial<Record<BenchmarkKey, number | null>>`로 변경 (미측정 벤치마크 허용)
- `languageScores`는 유지 (표시용, BVA 점수 계산에는 미사용)

### 1.4 Mongoose 스키마 변경

```typescript
// src/lib/db/models/model.ts — 변경사항

// scores 서브문서 삭제

// compliance 서브문서 추가
compliance: {
  soc2:          { type: Boolean, default: false },
  hipaa:         { type: Boolean, default: false },
  gdpr:          { type: Boolean, default: false },
  onPremise:     { type: Boolean, default: false },
  dataExclusion: { type: Boolean, default: false },
},

// benchmarks는 기존 Map 유지 (새 키 4개 추가는 데이터 레벨)
benchmarks: { type: Map, of: Schema.Types.Mixed },
```

**IModelDocument도 동일하게 변경** — `scores` 제거, `compliance` 추가.

---

## 2. BenchmarkMeta 컬렉션

벤치마크별 고객 설명용 메타데이터. UI 툴팁, 리포트 설명에 사용.

### 2.1 TypeScript 인터페이스

```typescript
// src/lib/types/bva.ts
export interface IBenchmarkMeta {
  readonly key: string
  readonly name: string
  readonly displayName: string
  readonly description: string
  readonly source: string
  readonly scoreRange: {
    readonly min: number
    readonly max: number
  }
  readonly interpretation: string
}
```

### 2.2 Mongoose 스키마

```typescript
// src/lib/db/models/benchmark-meta.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBenchmarkMetaDocument extends Document {
  key: string
  name: string
  displayName: string
  description: string
  source: string
  scoreRange: { min: number; max: number }
  interpretation: string
}

export const BenchmarkMetaSchema = new Schema({
  key:         { type: String, required: true, unique: true, index: true },
  name:        { type: String, required: true },
  displayName: { type: String, required: true },
  description: { type: String, required: true },
  source:      { type: String, required: true },
  scoreRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  interpretation: { type: String, required: true },
}, {
  timestamps: true,
})

export const BenchmarkMetaModel: Model<IBenchmarkMetaDocument> =
  mongoose.models.BenchmarkMeta || mongoose.model<IBenchmarkMetaDocument>('BenchmarkMeta', BenchmarkMetaSchema)
```

### 2.3 시드 데이터 (10개 벤치마크)

```json
// data/benchmark-meta.json
[
  {
    "key": "mmlu",
    "name": "MMLU",
    "displayName": "대학 수준 지식 이해력",
    "description": "수학, 역사, 법률 등 57개 분야의 객관식 문제로 모델의 지식 범위를 측정",
    "source": "UC Berkeley",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "90+ 전문가 수준, 80+ 우수, 70+ 양호"
  },
  {
    "key": "gpqa",
    "name": "GPQA",
    "displayName": "대학원 수준 과학 추론",
    "description": "물리, 화학, 생물 분야의 대학원 수준 질의응답으로 전문 과학 추론력 측정",
    "source": "NYU",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "65+ 전문가 수준, 50+ 우수, 40+ 양호"
  },
  {
    "key": "swe_bench",
    "name": "SWE-bench",
    "displayName": "소프트웨어 엔지니어링",
    "description": "실제 GitHub 이슈를 해결하는 능력을 측정. 코드 이해, 수정, 테스트 포함",
    "source": "Princeton NLP",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "60+ 최상위, 40+ 우수, 25+ 양호"
  },
  {
    "key": "aime",
    "name": "AIME",
    "displayName": "수학 경시대회 추론",
    "description": "미국 수학 경시대회(AIME) 문제로 고급 수학 추론 능력을 측정",
    "source": "MAA",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "80+ 최상위, 50+ 우수, 30+ 양호"
  },
  {
    "key": "hle",
    "name": "HLE",
    "displayName": "최고 난이도 추론",
    "description": "인간 전문가도 어려운 최고 난이도 문제로 모델의 추론 한계를 측정",
    "source": "Scale AI",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "20+ 최상위, 10+ 우수, 5+ 양호 (매우 어려운 벤치마크)"
  },
  {
    "key": "mgsm",
    "name": "MGSM",
    "displayName": "다국어 수학 추론",
    "description": "10개 언어(한국어 포함)로 된 수학 문제를 풀어 다국어 추론 능력 측정",
    "source": "Google Research",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "95+ 최상위, 90+ 우수, 80+ 양호"
  },
  {
    "key": "kmmlu",
    "name": "KMMLU",
    "displayName": "한국어 지식 이해력",
    "description": "한국 대학 수준 시험 문제(의학, 법학, 공학 등)로 한국어 전문 지식을 측정",
    "source": "KAIST",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "70+ 전문가 수준, 55+ 우수, 45+ 양호"
  },
  {
    "key": "kobest",
    "name": "KoBEST",
    "displayName": "한국어 자연어 이해",
    "description": "한국어 불리언 QA, 감성분석, 문장 유사도 등으로 한국어 이해력을 종합 측정",
    "source": "KLUE Benchmark",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "90+ 최상위, 80+ 우수, 70+ 양호"
  },
  {
    "key": "truthfulqa",
    "name": "TruthfulQA",
    "displayName": "사실성 평가",
    "description": "인간이 흔히 잘못 알고 있는 질문에 대해 사실에 기반한 정확한 답변 능력을 측정",
    "source": "Oxford / Anthropic",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "80+ 최상위, 65+ 우수, 50+ 양호"
  },
  {
    "key": "halueval",
    "name": "HaluEval",
    "displayName": "환각 방지 능력",
    "description": "모델이 생성한 텍스트에서 사실과 다른 내용(환각)을 감지하고 방지하는 능력을 측정",
    "source": "RUC AI Box",
    "scoreRange": { "min": 0, "max": 100 },
    "interpretation": "85+ 최상위, 70+ 우수, 55+ 양호"
  }
]
```

---

## 3. BvaDimension 컬렉션

벤치마크를 비즈니스 가치 평가 차원으로 매핑. 투명한 계산식을 고객에게 제시.

### 3.1 TypeScript 인터페이스

```typescript
// src/lib/types/bva.ts
export interface IBvaFormulaEntry {
  readonly benchmark: string
  readonly weight: number
}

export interface IBvaDimension {
  readonly key: BvaDimensionKey
  readonly displayName: string
  readonly description: string
  readonly formula: readonly IBvaFormulaEntry[]
  readonly formulaExplanation: string
}

export type BvaDimensionKey = 'reasoning' | 'korean' | 'coding' | 'knowledge' | 'reliability'
```

### 3.2 Mongoose 스키마

```typescript
// src/lib/db/models/bva-dimension.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBvaDimensionDocument extends Document {
  key: string
  displayName: string
  description: string
  formula: { benchmark: string; weight: number }[]
  formulaExplanation: string
}

export const BvaDimensionSchema = new Schema({
  key:         { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  description: { type: String, required: true },
  formula: [{
    benchmark: { type: String, required: true },
    weight:    { type: Number, required: true },
  }],
  formulaExplanation: { type: String, required: true },
}, {
  timestamps: true,
})

export const BvaDimensionModel: Model<IBvaDimensionDocument> =
  mongoose.models.BvaDimension || mongoose.model<IBvaDimensionDocument>('BvaDimension', BvaDimensionSchema)
```

### 3.3 시드 데이터 (5개 차원)

```json
// data/bva-dimensions.json
[
  {
    "key": "reasoning",
    "displayName": "종합 추론력",
    "description": "복잡한 문제를 단계적으로 분석하고 해결하는 능력",
    "formula": [
      { "benchmark": "gpqa", "weight": 0.4 },
      { "benchmark": "aime", "weight": 0.3 },
      { "benchmark": "hle", "weight": 0.3 }
    ],
    "formulaExplanation": "대학원 수준 과학(GPQA 40%) + 수학 경시대회(AIME 30%) + 최고 난이도 추론(HLE 30%)"
  },
  {
    "key": "korean",
    "displayName": "한국어 능력",
    "description": "한국어 이해, 생성, 전문 용어 처리 능력",
    "formula": [
      { "benchmark": "kmmlu", "weight": 0.5 },
      { "benchmark": "kobest", "weight": 0.3 },
      { "benchmark": "mgsm", "weight": 0.2 }
    ],
    "formulaExplanation": "한국어 전문 지식(KMMLU 50%) + 한국어 자연어 이해(KoBEST 30%) + 다국어 수학 추론(MGSM 20%)"
  },
  {
    "key": "coding",
    "displayName": "코딩 능력",
    "description": "코드 이해, 생성, 디버깅 및 소프트웨어 엔지니어링 역량",
    "formula": [
      { "benchmark": "swe_bench", "weight": 1.0 }
    ],
    "formulaExplanation": "실제 GitHub 이슈 해결(SWE-bench 100%)"
  },
  {
    "key": "knowledge",
    "displayName": "지식 범위",
    "description": "다양한 분야의 사실적 지식 보유량과 전문 지식 깊이",
    "formula": [
      { "benchmark": "mmlu", "weight": 0.7 },
      { "benchmark": "gpqa", "weight": 0.3 }
    ],
    "formulaExplanation": "57개 분야 지식(MMLU 70%) + 대학원 수준 전문 지식(GPQA 30%)"
  },
  {
    "key": "reliability",
    "displayName": "신뢰성",
    "description": "사실에 기반한 정확한 정보 제공 및 환각 방지 능력",
    "formula": [
      { "benchmark": "truthfulqa", "weight": 0.5 },
      { "benchmark": "halueval", "weight": 0.5 }
    ],
    "formulaExplanation": "사실성 평가(TruthfulQA 50%) + 환각 감지 및 방지(HaluEval 50%)"
  }
]
```

### 3.4 차원 점수 계산 로직

```typescript
// 차원 점수 계산 (score.ts에 반영될 로직)
function calculateDimensionScore(
  benchmarks: Partial<Record<string, number | null>>,
  formula: readonly { benchmark: string; weight: number }[],
): number | null {
  // null이 아닌 벤치마크만 추출
  const available = formula.filter(
    (entry) => benchmarks[entry.benchmark] != null,
  )

  // 사용 가능한 벤치마크가 없으면 null 반환
  if (available.length === 0) return null

  // 가중치 재정규화
  const totalWeight = available.reduce((sum, entry) => sum + entry.weight, 0)

  return available.reduce((score, entry) => {
    const normalizedWeight = entry.weight / totalWeight
    return score + (benchmarks[entry.benchmark] as number) * normalizedWeight
  }, 0)
}
```

**null 벤치마크 처리 전략:**
- 모델에 특정 벤치마크 데이터가 없으면 해당 항목을 건너뛰고 나머지 가중치를 재정규화
- 차원의 모든 벤치마크가 null이면 해당 차원 점수도 null
- null 차원은 총점 계산에서 제외하고 나머지 차원의 가중치를 재정규화

---

## 4. IPresetWeights 재설계

### 4.1 변경 전 (현재)

```typescript
export interface IPresetWeights {
  readonly quality: number     // 제거
  readonly speed: number       // 제거
  readonly reasoning: number   // 유지 (BvaDimension key)
  readonly coding: number      // 유지 (BvaDimension key)
  readonly multimodal: number  // 제거
  readonly cost: number        // 유지 (특수 차원)
  readonly korean: number      // 유지 (BvaDimension key)
}
```

### 4.2 변경 후

```typescript
// src/lib/types/preset.ts
import type { BvaDimensionKey } from './bva'

export type IPresetWeights = Record<BvaDimensionKey, number> & {
  readonly cost: number
}
```

전개하면:

```typescript
export interface IPresetWeights {
  readonly reasoning: number    // BvaDimension: 종합 추론력
  readonly korean: number       // BvaDimension: 한국어 능력
  readonly coding: number       // BvaDimension: 코딩 능력
  readonly knowledge: number    // BvaDimension: 지식 범위 (신규)
  readonly reliability: number  // BvaDimension: 신뢰성 (신규)
  readonly cost: number         // 특수 차원: 비용 효율성
}
```

**가중치 합 = 1.0** (6개 차원)

### 4.3 cost 차원 계산 (기존 로직 유지)

```typescript
const MAX_OUTPUT_PRICE = 60

// 상용 모델: 비용 점수 = max(0, 100 - output가격/60 * 100)
// OSS 모델: 비용 점수 = 100 (API 비용 없음)
function calculateCostScore(pricing: IModelPricing, type: ModelType): number {
  if (type === 'open-source') return 100
  return Math.max(0, 100 - (pricing.output / MAX_OUTPUT_PRICE) * 100)
}
```

### 4.4 프리셋 가중치 매핑 가이드

기존 7차원 -> 신규 6차원 매핑 원칙:

| 기존 차원 | 매핑 | 근거 |
|-----------|------|------|
| quality | knowledge + reliability에 분배 | 품질은 지식 범위와 신뢰성의 조합 |
| speed | 제거 | 벤치마크 근거 없는 주관적 지표 |
| reasoning | reasoning 유지 | 동일 |
| coding | coding 유지 | 동일 |
| multimodal | 제거 | BVA 벤치마크 커버리지 밖 |
| cost | cost 유지 | 동일 |
| korean | korean 유지 | 동일 |

**예시: CS 챗봇 프리셋 변환**

```
기존: quality=0.15, speed=0.25, reasoning=0.10, coding=0.00, multimodal=0.05, cost=0.30, korean=0.15

변환:
- speed(0.25) + multimodal(0.05) = 0.30 -> 재분배
- quality(0.15) -> knowledge(0.10) + reliability(0.05)
- 재분배 0.30 -> cost(+0.10), reliability(+0.10), knowledge(+0.10)

신규: reasoning=0.10, korean=0.15, coding=0.00, knowledge=0.20, reliability=0.15, cost=0.40
```

### 4.5 Mongoose 스키마 변경

```typescript
// src/lib/db/models/industry-preset.ts — weights 부분
weights: {
  reasoning:   { type: Number, default: 0 },
  korean:      { type: Number, default: 0 },
  coding:      { type: Number, default: 0 },
  knowledge:   { type: Number, default: 0 },
  reliability: { type: Number, default: 0 },
  cost:        { type: Number, default: 0 },
},
```

---

## 5. BVA 입력 타입

### 5.1 고객 프로필 인터페이스

```typescript
// src/lib/types/bva.ts

export type VolumeRange = 'under-10k' | '10k-100k' | '100k-1m' | 'over-1m'
export type SupportedLanguage = 'ko' | 'en' | 'ja' | 'zh'
export type ToneStyle = 'formal' | 'casual' | 'technical'

export interface IBvaSecurityRequirements {
  readonly onPremiseRequired: boolean
  readonly personalDataHandling: boolean
  readonly regulatedIndustry: boolean
}

export interface IBvaCustomerProfile {
  readonly industry: string              // categorySlug (기존 프리셋 카테고리)
  readonly taskTypes: readonly string[]  // taskTypeSlug[] (멀티셀렉트)
  readonly monthlyVolume: VolumeRange
  readonly languages: readonly SupportedLanguage[]
  readonly tone: ToneStyle
  readonly security: IBvaSecurityRequirements
}
```

### 5.2 BVA 결과 타입

```typescript
// src/lib/types/bva.ts

export interface IBvaDimensionScore {
  readonly key: BvaDimensionKey
  readonly displayName: string
  readonly score: number | null
  readonly benchmarkDetails: readonly {
    readonly benchmark: string
    readonly benchmarkName: string
    readonly score: number | null
    readonly weight: number
  }[]
}

export interface IBvaComplianceCheck {
  readonly requirement: string
  readonly displayName: string
  readonly met: boolean
}

export interface IBvaCostEstimate {
  readonly monthlyTokens: number
  readonly monthlyCost: number
  readonly costPerRequest: number
  readonly currency: 'USD'
}

export interface IBvaRankedModel {
  readonly slug: string
  readonly name: string
  readonly provider: string
  readonly type: ModelType
  readonly totalScore: number
  readonly dimensionScores: readonly IBvaDimensionScore[]
  readonly costScore: number
  readonly costEstimate: IBvaCostEstimate | null
  readonly complianceChecks: readonly IBvaComplianceCheck[]
  readonly infra: IRankedModelInfra | null
}

export interface IBvaReport {
  readonly profile: IBvaCustomerProfile
  readonly commercial: readonly IBvaRankedModel[]
  readonly openSource: readonly IBvaRankedModel[]
  readonly generatedAt: string
}
```

### 5.3 볼륨 -> 토큰 추정 상수

```typescript
// src/lib/constants/bva.ts
export const VOLUME_TOKEN_ESTIMATES: Record<VolumeRange, { inputTokens: number; outputTokens: number }> = {
  'under-10k':  { inputTokens: 5_000_000,    outputTokens: 2_500_000 },
  '10k-100k':   { inputTokens: 50_000_000,   outputTokens: 25_000_000 },
  '100k-1m':    { inputTokens: 500_000_000,  outputTokens: 250_000_000 },
  'over-1m':    { inputTokens: 5_000_000_000, outputTokens: 2_500_000_000 },
}
```

---

## 6. IRankedModel 변경

### 6.1 변경 전

```typescript
export interface IRankedModel {
  readonly slug: string
  readonly name: string
  readonly provider: string
  readonly type: 'commercial' | 'open-source'
  readonly score: number
  readonly breakdown: Record<string, number>  // { quality, speed, reasoning, ... }
  readonly infra: IRankedModelInfra | null
}
```

### 6.2 변경 후

```typescript
// src/lib/types/preset.ts

export interface IRankedModel {
  readonly slug: string
  readonly name: string
  readonly provider: string
  readonly type: 'commercial' | 'open-source'
  readonly score: number
  readonly breakdown: Record<BvaDimensionKey | 'cost', number>
  readonly infra: IRankedModelInfra | null
}
```

**breakdown 키 변경:**
- 기존: `{ quality, speed, reasoning, coding, multimodal, cost, korean }`
- 변경: `{ reasoning, korean, coding, knowledge, reliability, cost }`

### 6.3 score.ts 변경

```typescript
// src/lib/utils/score.ts — 전면 교체

import type { IModelPricing, ModelType, BenchmarkKey } from '@/lib/types/model'
import type { IPresetWeights } from '@/lib/types/preset'
import type { BvaDimensionKey, IBvaFormulaEntry } from '@/lib/types/bva'

const MAX_OUTPUT_PRICE = 60

// BvaDimension 데이터는 서비스 초기화 시 DB에서 로드하거나 상수로 관리
// 아래는 계산 로직만 정의

export function calculateDimensionScore(
  benchmarks: Partial<Record<BenchmarkKey, number | null>>,
  formula: readonly IBvaFormulaEntry[],
): number | null {
  const available = formula.filter(
    (entry) => benchmarks[entry.benchmark as BenchmarkKey] != null,
  )
  if (available.length === 0) return null

  const totalWeight = available.reduce((sum, e) => sum + e.weight, 0)
  return available.reduce((score, e) => {
    const value = benchmarks[e.benchmark as BenchmarkKey] as number
    return score + value * (e.weight / totalWeight)
  }, 0)
}

export function calculateCostScore(
  pricing: IModelPricing,
  type: ModelType,
): number {
  if (type === 'open-source') return 100
  return Math.max(0, 100 - (pricing.output / MAX_OUTPUT_PRICE) * 100)
}

export function calculateFitnessScore(
  dimensionScores: Record<BvaDimensionKey, number | null>,
  costScore: number,
  weights: IPresetWeights,
): number {
  let totalScore = costScore * weights.cost
  let usedWeight = weights.cost

  const dimensionKeys: BvaDimensionKey[] = ['reasoning', 'korean', 'coding', 'knowledge', 'reliability']
  for (const key of dimensionKeys) {
    const dimScore = dimensionScores[key]
    if (dimScore != null) {
      totalScore += dimScore * weights[key]
      usedWeight += weights[key]
    }
  }

  // null 차원 제외 후 정규화
  return usedWeight > 0 ? totalScore / usedWeight : 0
}

export function calculateFitnessBreakdown(
  dimensionScores: Record<BvaDimensionKey, number | null>,
  costScore: number,
  weights: IPresetWeights,
): Record<BvaDimensionKey | 'cost', number> {
  return {
    reasoning:   (dimensionScores.reasoning ?? 0) * weights.reasoning,
    korean:      (dimensionScores.korean ?? 0) * weights.korean,
    coding:      (dimensionScores.coding ?? 0) * weights.coding,
    knowledge:   (dimensionScores.knowledge ?? 0) * weights.knowledge,
    reliability: (dimensionScores.reliability ?? 0) * weights.reliability,
    cost:        costScore * weights.cost,
  }
}
```

### 6.4 recommendation.service.ts 변경 개요

```typescript
// src/lib/services/recommendation.service.ts — 변경 개요

// 1. BvaDimension 데이터 로드 (DB 또는 상수)
// 2. 각 모델에 대해:
//    a. benchmarks에서 각 차원 점수 계산 (calculateDimensionScore)
//    b. costScore 계산 (calculateCostScore)
//    c. 총점 계산 (calculateFitnessScore)
//    d. breakdown 계산 (calculateFitnessBreakdown)
// 3. 정렬 + diversify 로직 (기존 유지)
```

---

## 7. 마이그레이션 노트

### 7.1 models.json 변경사항

**87개 모델 전체에 적용:**

| 작업 | 상세 |
|------|------|
| `scores` 제거 | `quality`, `speed`, `reasoning`, `coding`, `multimodal` 5개 필드 삭제 |
| `compliance` 추가 | 기본값: 모든 필드 `false`. T2(조사 태스크)에서 실제 값 채움 |
| 신규 벤치마크 추가 | `kmmlu`, `kobest`, `truthfulqa`, `halueval` 키 추가. 초기값 `null`. T2에서 실제 값 채움 |
| `languageScores` | 변경 없음 (유지) |

**변경 전 모델 예시:**
```json
{
  "name": "GPT-4o",
  "scores": { "quality": 88, "speed": 82, "reasoning": 82, "coding": 85, "multimodal": 90 },
  "benchmarks": { "mmlu": 88.7, "gpqa": 53.6, "swe_bench": 33.2, "aime": 26.7, "hle": 3.3, "mgsm": 90.5 }
}
```

**변경 후:**
```json
{
  "name": "GPT-4o",
  "compliance": { "soc2": false, "hipaa": false, "gdpr": false, "onPremise": false, "dataExclusion": false },
  "benchmarks": {
    "mmlu": 88.7, "gpqa": 53.6, "swe_bench": 33.2, "aime": 26.7, "hle": 3.3, "mgsm": 90.5,
    "kmmlu": null, "kobest": null, "truthfulqa": null, "halueval": null
  }
}
```

### 7.2 industry-presets.json 변경사항

**12개 프리셋 전체에 적용:**

| 작업 | 상세 |
|------|------|
| `weights` 키 변경 | `quality`, `speed`, `multimodal` 제거; `knowledge`, `reliability` 추가 |
| 가중치 재배분 | 제거된 차원의 가중치를 신규 차원에 재분배 (합 = 1.0) |

### 7.3 신규 시드 파일 목록

| 파일 | 레코드 수 | 용도 |
|------|-----------|------|
| `data/benchmark-meta.json` | 10 | 벤치마크 메타데이터 |
| `data/bva-dimensions.json` | 5 | BVA 차원 매핑 |

### 7.4 시드 스크립트 변경

기존 `scripts/seed.ts`에 추가:
1. BenchmarkMeta 컬렉션 upsert (key 기준)
2. BvaDimension 컬렉션 upsert (key 기준)
3. Model 컬렉션 upsert 시 `scores` 제거, `compliance` 추가 반영

### 7.5 constants/benchmarks.ts 변경

```typescript
// src/lib/constants/benchmarks.ts — 10개로 확장
export const BENCHMARKS = {
  mmlu:       { label: 'MMLU',        description: '대학 수준 지식 이해력',  maxScore: 100 },
  gpqa:       { label: 'GPQA',        description: '대학원 수준 과학 추론',  maxScore: 100 },
  swe_bench:  { label: 'SWE-bench',   description: '소프트웨어 엔지니어링',   maxScore: 100 },
  aime:       { label: 'AIME',        description: '수학 경시대회 추론',     maxScore: 100 },
  hle:        { label: 'HLE',         description: '최고 난이도 추론',       maxScore: 100 },
  mgsm:       { label: 'MGSM',        description: '다국어 수학 추론',       maxScore: 100 },
  kmmlu:      { label: 'KMMLU',       description: '한국어 지식 이해력',     maxScore: 100 },
  kobest:     { label: 'KoBEST',      description: '한국어 자연어 이해',     maxScore: 100 },
  truthfulqa: { label: 'TruthfulQA',  description: '사실성 평가',           maxScore: 100 },
  halueval:   { label: 'HaluEval',    description: '환각 방지 능력',         maxScore: 100 },
} as const
```

### 7.6 영향받는 타입 임포트

scores 제거로 인해 `IModelScores`를 임포트하는 모든 파일 수정 필요:

| 파일 | 변경 |
|------|------|
| `src/lib/utils/score.ts` | `IModelScores` 임포트 제거, 새 시그니처로 교체 |
| `src/lib/services/recommendation.service.ts` | 새 score 함수 시그니처에 맞춰 호출부 변경 |
| UI 컴포넌트 (10개) | `model.scores.*` 접근하는 모든 코드 변경 |

---

## 부록: 타입 관계도

```
IModel
  ├── pricing: IModelPricing
  ├── compliance: IModelCompliance          (신규)
  ├── benchmarks: Partial<Record<BenchmarkKey, number | null>>
  ├── languageScores: Record<string, number>
  └── infrastructure: IModelInfrastructure | null

BenchmarkMeta (컬렉션)
  └── key -> BenchmarkKey와 1:1 매핑

BvaDimension (컬렉션)
  ├── key: BvaDimensionKey
  └── formula[].benchmark -> BenchmarkKey 참조

IPresetWeights
  └── Record<BvaDimensionKey, number> & { cost: number }

IRankedModel
  └── breakdown: Record<BvaDimensionKey | 'cost', number>

IBvaCustomerProfile (입력)
  └── security -> IModelCompliance 필터 조건으로 활용

IBvaReport (출력)
  └── IBvaRankedModel[]
       ├── dimensionScores: IBvaDimensionScore[]
       ├── complianceChecks: IBvaComplianceCheck[]
       └── costEstimate: IBvaCostEstimate | null
```
