# Current Database Schema

> atom-models MongoDB 스키마 현황 (2026-03-11 기준)

## Overview

| Collection | Document 수 | 용도 | Seed 파일 |
|---|---|---|---|
| Model | 50 | LLM 모델 정보 (상용 23 + OSS 27) | `data/models.json` |
| IndustryPreset | 12 | 산업별 업무 프리셋 (5개 카테고리) | `data/industry-presets.json` |
| GpuReference | 11 | GPU 스펙 참조 데이터 | `data/gpu-reference.json` |
| BenchmarkMeta | 7 | 벤치마크 메타 정의 | `data/benchmark-meta.json` |
| BvaDimension | 4 | BVA 평가 차원 정의 | `data/bva-dimensions.json` |
| PriceHistory | ~50/일 | 모델별 가격 이력 | 시드 시 자동 생성 |
| PlaygroundSession | 가변 | Playground 대화 세션 | 사용자 생성 |

---

## 1. Model

핵심 컬렉션. 모든 LLM 모델 정보를 하나의 도큐먼트에 포함 (flat structure).

**파일:** `src/lib/db/models/model.ts`

```
Model {
  // === 기본 식별 ===
  name:              String, required, unique
  slug:              String, required, unique, indexed
  provider:          String, required, indexed       // "OpenAI", "Anthropic", "Google" 등
  type:              Enum["commercial", "open-source"], required, indexed
  tier:              Enum["flagship", "mid", "small", "mini", "micro"], indexed

  // === 모델 스펙 ===
  parameterSize:     Number | null                   // 총 파라미터 (B 단위)
  activeParameters:  Number | null                   // MoE 활성 파라미터
  architecture:      Enum["dense", "moe"]
  contextWindow:     Number                          // 토큰 수
  maxOutput:         Number                          // 최대 출력 토큰
  license:           String                          // "Proprietary", "Apache 2.0" 등

  // === 가격 (내장 서브도큐먼트) ===
  pricing: {
    input:             Number                        // $/1M input tokens
    output:            Number                        // $/1M output tokens
    cachingDiscount:   Number                        // 0~1 할인율
    batchDiscount:     Number                        // 0~1 할인율
  }

  // === 컴플라이언스 (내장 서브도큐먼트) ===
  compliance: {
    soc2:            Boolean, default: false
    hipaa:           Boolean, default: false
    gdpr:            Boolean, default: false
    onPremise:       Boolean, default: false
    dataExclusion:   Boolean, default: false
  }

  // === 벤치마크 (Map 타입) ===
  languageScores:    Map<String, Number>             // 현재 미사용 (빈 객체)
  benchmarks:        Map<String, Number|null>        // 키: mmlu, gpqa, swe_bench, aime, hle, mgsm, kmmlu

  // === 인프라 (OSS 전용, nullable 서브도큐먼트) ===
  infrastructure: {
    minGpu:              String                      // "NVIDIA RTX 4090" 등
    vramFp16:            Number                      // GB
    vramFp8:             Number?                     // GB (optional)
    vramInt8:            Number                      // GB
    vramInt4:            Number                      // GB
    vramQ6k:             Number?                     // GGUF 양자화 VRAM (optional)
    vramQ5k:             Number?
    vramQ4kM:            Number?
    vramQ3k:             Number?
    vramQ2k:             Number?
    recommendedFramework: [String]                   // ["vLLM", "TGI"] 등
    estimatedTps:        Number                      // tokens/sec (H100 기준)
  } | null                                           // commercial 모델은 null

  // === 메타 ===
  releaseDate:       Date, required
  memo:              String
  sourceUrls:        [String]
  colorCode:         String                          // 프로바이더 색상 (#10A37F 등)
  openRouterModelId: String | null                   // OpenRouter API 매핑 ID
  lastVerifiedAt:    Date, default: Date.now

  // === 자동 ===
  createdAt:         Date (timestamps)
  updatedAt:         Date (timestamps)

  // === 가상 필드 ===
  isRecentlyReleased: Boolean (virtual)              // releaseDate가 30일 이내면 true
}
```

**인덱스:**
- `slug` (unique)
- `provider` (단일)
- `type` (단일)
- `tier` (단일)
- `{ provider: 1, type: 1 }` (복합)
- `{ 'pricing.input': 1 }`
- `{ releaseDate: -1 }`
- `{ name: 'text', provider: 'text' }` (텍스트 검색)

---

## 2. IndustryPreset

산업별 업무 유형과 BVA 가중치, 추천 모델을 정의.

**파일:** `src/lib/db/models/industry-preset.ts`

```
IndustryPreset {
  category:      String, required, indexed           // "금융", "개발/IT" 등
  categorySlug:  String, required, indexed
  taskType:      String, required                    // "리스크 분석", "코드 리뷰" 등
  taskTypeSlug:  String, required

  weights: {
    reasoning:   Number, default: 0                  // 0~100, 합계 100
    korean:      Number, default: 0
    coding:      Number, default: 0
    knowledge:   Number, default: 0
    cost:        Number, default: 0
  }

  recommendations: {
    commercial:    [{ modelSlug: String, reason: String }]
    costEffective: [{ modelSlug: String, reason: String }]
    openSource:    [{ modelSlug: String, reason: String }]
  }

  description:   String
  keyFactors:    [String]

  createdAt:     Date (timestamps)
  updatedAt:     Date (timestamps)
}
```

**인덱스:**
- `{ categorySlug: 1, taskTypeSlug: 1 }` (unique 복합)

**현재 카테고리:** 개발/IT, 고객 서비스, 금융, 영업/마케팅, 이커머스 (5개, 총 12 프리셋)

---

## 3. GpuReference

OSS 모델 운영에 필요한 GPU 하드웨어 참조 데이터.

**파일:** `src/lib/db/models/gpu-reference.ts`

```
GpuReference {
  name:          String, required, unique            // "NVIDIA H100 80GB SXM"
  slug:          String, required, unique
  vendor:        String                              // "NVIDIA"
  vram:          Number                              // GB
  memoryType:    String                              // "HBM3", "GDDR6X"
  fp16Tflops:    Number
  int8Tops:      Number
  tdp:           Number                              // Watts
  msrp:          Number                              // USD
  cloudHourly:   Number                              // $/hour
  category:      Enum["datacenter", "consumer", "workstation"]
  notes:         String

  createdAt:     Date (timestamps)
  updatedAt:     Date (timestamps)
}
```

**현재 데이터:** 11개 GPU (datacenter 5, consumer 4, workstation 2)

---

## 4. BenchmarkMeta

벤치마크의 메타 정보 (이름, 출처, 점수 범위 등).

**파일:** `src/lib/db/models/benchmark-meta.ts`

```
BenchmarkMeta {
  key:            String, required, unique, indexed  // "mmlu", "gpqa" 등
  name:           String, required                   // "MMLU"
  displayName:    String, required                   // "MMLU (Massive Multitask)"
  description:    String, required
  source:         String, required                   // URL 또는 출처
  scoreRange: {
    min:          Number, required                   // 0
    max:          Number, required                   // 100
  }
  interpretation: String, required                   // 점수 해석 가이드

  createdAt:      Date (timestamps)
  updatedAt:      Date (timestamps)
}
```

**현재 벤치마크:** mmlu, gpqa, swe_bench, aime, hle, mgsm, kmmlu (7개)

---

## 5. BvaDimension

BVA(Business Value Assessment) 평가 차원 정의. 각 차원은 벤치마크의 가중 조합으로 계산.

**파일:** `src/lib/db/models/bva-dimension.ts`

```
BvaDimension {
  key:                String, required, unique, indexed  // "reasoning", "korean" 등
  displayName:        String, required                   // "종합 추론력"
  description:        String, required
  formula: [{
    benchmark:        String, required                   // BenchmarkMeta.key 참조
    weight:           Number, required                   // 0~1, 합계 1.0
  }]
  formulaExplanation: String, required

  createdAt:          Date (timestamps)
  updatedAt:          Date (timestamps)
}
```

**현재 차원:**
| key | displayName | 공식 |
|---|---|---|
| reasoning | 종합 추론력 | GPQA(0.4) + AIME(0.3) + HLE(0.3) |
| korean | 한국어 능력 | KMMLU(0.7) + MGSM(0.3) |
| coding | 코딩 능력 | SWE-bench(1.0) |
| knowledge | 지식 범위 | MMLU(0.7) + GPQA(0.3) |

---

## 6. PriceHistory

모델 가격 변동 이력 추적용. 시드 시 초기 레코드 생성, 이후 자동/수동 갱신.

**파일:** `src/lib/db/models/price-history.ts`

```
PriceHistory {
  modelId:       ObjectId, ref: "Model", required, indexed
  modelSlug:     String, required, indexed
  inputPrice:    Number, required                    // $/1M input tokens
  outputPrice:   Number, required                    // $/1M output tokens
  recordedAt:    Date, required, default: Date.now

  createdAt:     Date (timestamps)
  updatedAt:     Date (timestamps)
}
```

**인덱스:**
- `{ modelId: 1, recordedAt: -1 }` (복합)

---

## 7. PlaygroundSession

Playground에서 생성된 멀티모델 대화 세션.

**파일:** `src/lib/db/models/playground-session.ts`

```
PlaygroundSession {
  title:           String, required

  models: [{
    modelId:           ObjectId, ref: "Model", required
    modelName:         String, required
    provider:          String, required
    openRouterModelId: String, required
    colorCode:         String, default: "#888888"
    parameters: {
      temperature:     Number?
      maxTokens:       Number?
      topP:            Number?
    }
  }]

  systemPrompt:    String, default: ""

  messages: [{
    role:            Enum["user", "assistant"], required
    content:         String, required
    modelId:         ObjectId?, ref: "Model"
    metrics: {
      ttft:            Number                        // Time to first token (ms)
      totalTime:       Number                        // Total response time (ms)
      tps:             Number                        // Tokens per second
      inputTokens:     Number
      outputTokens:    Number
      estimatedCost:   Number                        // USD
    }
    createdAt:       Date, default: Date.now
  }]

  defaultParameters: {
    temperature:     Number, default: 0.7
    maxTokens:       Number, default: 4096
    topP:            Number, default: 1.0
  }

  createdAt:       Date (timestamps)
  updatedAt:       Date (timestamps)
}
```

**인덱스:**
- `{ createdAt: -1 }`

---

## Entity Relationship

```
Model (50)
  ├── PriceHistory (N:1)         modelId/modelSlug로 참조
  ├── PlaygroundSession.models   modelId로 참조
  ├── PlaygroundSession.messages modelId로 참조 (assistant)
  └── IndustryPreset.recommendations  modelSlug로 참조

BenchmarkMeta (7)
  └── BvaDimension.formula.benchmark  key로 참조 (논리적, FK 없음)

BvaDimension (4)
  └── IndustryPreset.weights          key 매핑 (논리적, FK 없음)

GpuReference (11)
  └── Model.infrastructure.minGpu     name으로 참조 (논리적, FK 없음)
```

---

## 현재 구조의 특징

### Flat 구조 (비정규화)
- Model 컬렉션에 모든 데이터가 내장 (pricing, compliance, benchmarks, infrastructure)
- 장점: 단일 쿼리로 전체 모델 정보 조회 가능
- 단점: 동일 provider의 compliance 정보가 모델마다 중복, 벤치마크 갱신 시 모델 도큐먼트 전체 수정 필요

### 논리적 참조 (FK 없음)
- IndustryPreset -> Model: `modelSlug`로 참조 (물리적 FK 없음)
- BvaDimension -> BenchmarkMeta: `key`로 참조 (물리적 FK 없음)
- Model -> GpuReference: `minGpu` 이름으로 참조 (물리적 FK 없음)

### 미사용/예비 필드
- `languageScores`: 모든 모델이 빈 객체 `{}`
- `sourceUrls`: 대부분 빈 배열 `[]`

### 시드 데이터 관리
- 7개 JSON 파일 (`data/` 디렉토리)
- `scripts/seed.ts`로 upsert 또는 force(drop+insert) 모드 실행
- PriceHistory는 시드 시 Model의 현재 pricing으로부터 자동 생성
