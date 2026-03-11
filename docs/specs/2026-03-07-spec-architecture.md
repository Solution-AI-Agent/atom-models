# atom-models 아키텍처 설계서

**버전:** v1.0
**작성일:** 2026.03.07
**범위:** Phase 1 MVP 중심, Phase 2~3 확장 고려

---

## 1. 설계 원칙

- **시드 데이터 기반**: 관리자 UI 없이 JSON + import 스크립트로 데이터 관리
- **인증 없음**: 도구 용도이므로 전체 공개
- **서버 컴포넌트 우선**: SEO + 초기 로딩 최적화를 위해 가능한 한 서버에서 렌더링
- **URL 기반 상태**: 필터, 비교 선택 등 주요 상태를 URL에 인코딩하여 공유 가능
- **서비스 레이어 분리**: Mongoose 직접 호출 대신 서비스 함수를 통해 데이터 접근

---

## 2. DB 스키마

### 2.1 Model

```typescript
// lib/db/schemas/model.ts
const ModelSchema = new Schema({
  // -- 식별 --
  name:          { type: String, required: true, unique: true },     // "Claude Sonnet 4.5"
  slug:          { type: String, required: true, unique: true, index: true }, // "claude-sonnet-4-5"
  provider:      { type: String, required: true, index: true },      // "Anthropic"
  type:          { type: String, enum: ['commercial', 'open-source'], required: true, index: true },
  tier:          { type: String, enum: ['flagship', 'mid', 'small', 'mini', 'micro'], index: true },

  // -- 아키텍처 --
  parameterSize:    Number,    // 전체 파라미터 (십억 단위, e.g. 405)
  activeParameters: Number,    // MoE 활성 파라미터
  architecture:     { type: String, enum: ['dense', 'moe'] },
  contextWindow:    Number,    // 토큰 수 (e.g. 200000)
  maxOutput:        Number,    // 최대 출력 토큰
  license:          String,    // "Apache 2.0", "Proprietary" 등

  // -- 비용 (1M 토큰당 USD) --
  pricing: {
    input:           Number,   // e.g. 3.00
    output:          Number,   // e.g. 15.00
    cachingDiscount: Number,   // 0~1 비율 (e.g. 0.9 = 90% 할인)
    batchDiscount:   Number,   // 0~1 비율
  },

  // -- 범용 평가 (0~100) --
  scores: {
    quality:    Number,
    speed:      Number,
    reasoning:  Number,
    coding:     Number,
    multimodal: Number,
  },

  // -- 다국어 평가 (0~100) --
  languageScores: {
    type: Map,
    of: Number,
    // { ko: 85, en: 95, ja: 80, zh: 82 }
  },

  // -- 벤치마크 원점수 (유연한 Map 구조) --
  benchmarks: {
    type: Map,
    of: Schema.Types.Mixed,
    // { mmlu: 87.5, gpqa: 72.3, swe_bench: 49.0, aime: 83.6, hle: 18.2, mgsm: 91.0 }
  },

  // -- 인프라 요구사항 (오픈소스 모델용) --
  infrastructure: {
    minGpu:               String,     // "1x A100 80GB"
    vramFp16:             Number,     // GB
    vramInt8:             Number,
    vramInt4:             Number,
    recommendedFramework: [String],   // ["vLLM", "SGLang"]
    estimatedTps:         Number,     // tokens per second
  },

  // -- 메타 --
  releaseDate:    { type: Date, required: true },
  memo:           String,
  sourceUrls:     [String],
  colorCode:      String,              // 차트 표시용 컬러
  lastVerifiedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// 가상 필드: NEW 배지 (30일 이내 출시)
ModelSchema.virtual('isNew').get(function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.releaseDate >= thirtyDaysAgo;
});

// 인덱스
ModelSchema.index({ provider: 1, type: 1 });
ModelSchema.index({ 'pricing.input': 1 });
ModelSchema.index({ releaseDate: -1 });
ModelSchema.index({ name: 'text', provider: 'text' }); // 텍스트 검색용
```

**설계 근거:**
- `benchmarks`는 `Map<String, Mixed>` — 모델마다 지원하는 벤치마크가 다르므로 유연한 구조 필요
- `languageScores`도 `Map` — 향후 언어 추가 시 스키마 변경 불필요
- `infrastructure`는 임베디드 객체 — 상용 모델은 빈 값, 오픈소스만 채움
- `isNew`는 가상 필드 — 저장하지 않고 30일 기준으로 동적 계산

### 2.2 IndustryPreset

```typescript
// lib/db/schemas/industry-preset.ts
const IndustryPresetSchema = new Schema({
  category:     { type: String, required: true, index: true },  // "고객 서비스"
  categorySlug: { type: String, required: true, index: true },  // "customer-service"
  taskType:     { type: String, required: true },                // "CS 챗봇, FAQ 자동 응답"
  taskTypeSlug: { type: String, required: true },                // "cs-chatbot"

  // 가중치 (합계 1.0)
  weights: {
    quality:    { type: Number, default: 0 },
    speed:      { type: Number, default: 0 },
    reasoning:  { type: Number, default: 0 },
    coding:     { type: Number, default: 0 },
    multimodal: { type: Number, default: 0 },
    cost:       { type: Number, default: 0 },   // 비용 역수 점수에 적용
    korean:     { type: Number, default: 0 },   // languageScores.ko 매핑
  },

  // 정적 추천 (F6.2)
  recommendations: {
    commercial:   [{ modelSlug: String, reason: String }],
    costEffective: [{ modelSlug: String, reason: String }],
    openSource:   [{ modelSlug: String, reason: String }],
  },

  description: String,    // 프리셋 설명
  keyFactors:  [String],  // 핵심 가중 요소 표시용 (e.g. ["속도", "다국어", "비용"])
}, {
  timestamps: true,
});

IndustryPresetSchema.index({ categorySlug: 1, taskTypeSlug: 1 }, { unique: true });
```

**적합도 점수 계산 로직 (서비스 레이어에서 처리):**

```typescript
// lib/services/recommendation.ts
function calculateFitnessScore(model: Model, preset: IndustryPreset): number {
  const { weights } = preset;
  const { scores, pricing, languageScores } = model;

  // 비용 점수: 가격이 낮을수록 높은 점수 (0~100 정규화)
  const maxPrice = 60; // 최대 기준 단가 (USD/1M tokens output)
  const costScore = Math.max(0, 100 - ((pricing.output / maxPrice) * 100));

  return (
    (scores.quality    * (weights.quality    || 0)) +
    (scores.speed      * (weights.speed      || 0)) +
    (scores.reasoning  * (weights.reasoning  || 0)) +
    (scores.coding     * (weights.coding     || 0)) +
    (scores.multimodal * (weights.multimodal || 0)) +
    (costScore         * (weights.cost       || 0)) +
    ((languageScores.get('ko') || 0) * (weights.korean || 0))
  );
}
```

### 2.3 PriceHistory

```typescript
// lib/db/schemas/price-history.ts
const PriceHistorySchema = new Schema({
  modelId:     { type: Schema.Types.ObjectId, ref: 'Model', required: true, index: true },
  modelSlug:   { type: String, required: true, index: true },  // 조회 편의용
  inputPrice:  { type: Number, required: true },
  outputPrice: { type: Number, required: true },
  recordedAt:  { type: Date, required: true, default: Date.now },
}, {
  timestamps: true,
});

PriceHistorySchema.index({ modelId: 1, recordedAt: -1 });
```

### 2.4 GpuReference (Phase 1: 시드 데이터)

```typescript
// lib/db/schemas/gpu-reference.ts
const GpuReferenceSchema = new Schema({
  name:         { type: String, required: true, unique: true },  // "NVIDIA A100 80GB"
  vendor:       String,    // "NVIDIA"
  vram:         Number,    // GB
  memoryType:   String,    // "HBM2e"
  fp16Tflops:   Number,
  int8Tops:     Number,
  tdp:          Number,    // Watts
  msrp:         Number,    // USD
  cloudHourly:  Number,    // USD/hr 대표 클라우드 단가
  category:     { type: String, enum: ['datacenter', 'consumer', 'workstation'] },
  notes:        String,
}, {
  timestamps: true,
});
```

---

## 3. 프로젝트 디렉토리 구조

```
atom-models/
├── docs/
│   ├── specs/                        # 제품/아키텍처 스펙
│   ├── plans/                        # 설계/구현 계획
│   ├── schemas/                      # DB/데이터 스키마
│   ├── retros/                       # 회고
│   ├── adrs/                         # 아키텍처 의사결정 기록
│   └── refs/                         # 참고 자료
│
├── scripts/
│   └── seed.ts                      # 시드 데이터 import 스크립트
│
├── data/
│   ├── models.json                  # 36+ 모델 시드 데이터
│   ├── industry-presets.json        # 산업별 프리셋 시드 데이터
│   ├── gpu-reference.json           # GPU 레퍼런스 시드 데이터
│   └── price-history.json           # 초기 가격 이력
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               # 루트 레이아웃 (Header, CompareBar)
│   │   ├── page.tsx                 # 홈
│   │   │
│   │   ├── explore/
│   │   │   ├── page.tsx             # 모델 탐색 (테이블/카드 뷰)
│   │   │   └── [slug]/
│   │   │       └── page.tsx         # 모델 상세
│   │   │
│   │   ├── compare/
│   │   │   └── page.tsx             # 비교 뷰
│   │   │
│   │   ├── infra/
│   │   │   └── page.tsx             # GPU 레퍼런스 (Phase 1)
│   │   │
│   │   ├── recommendations/
│   │   │   ├── page.tsx             # 산업 카테고리 목록
│   │   │   └── [categorySlug]/
│   │   │       └── page.tsx         # 산업별 추천 상세
│   │   │
│   │   ├── simulator/               # Phase 2
│   │   │   └── page.tsx
│   │   │
│   │   ├── trends/                  # Phase 3
│   │   │   └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── models/
│   │       │   ├── route.ts         # GET: 모델 목록
│   │       │   └── [slug]/
│   │       │       └── route.ts     # GET: 모델 상세
│   │       │
│   │       ├── industry-presets/
│   │       │   ├── route.ts         # GET: 프리셋 목록
│   │       │   └── [categorySlug]/
│   │       │       └── route.ts     # GET: 카테고리별 프리셋
│   │       │
│   │       └── gpu/
│   │           └── route.ts         # GET: GPU 레퍼런스
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── nav.tsx
│   │   │   └── compare-floating-bar.tsx
│   │   │
│   │   ├── shared/
│   │   │   ├── score-badge.tsx
│   │   │   ├── new-badge.tsx
│   │   │   ├── model-type-badge.tsx
│   │   │   ├── price-display.tsx
│   │   │   ├── search-input.tsx
│   │   │   ├── sort-select.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── pagination.tsx
│   │   │
│   │   ├── home/
│   │   │   ├── hero-section.tsx
│   │   │   ├── stats-overview.tsx
│   │   │   ├── new-models-section.tsx
│   │   │   └── quick-access-cards.tsx
│   │   │
│   │   ├── explore/
│   │   │   ├── view-toggle.tsx
│   │   │   ├── filter-panel.tsx
│   │   │   ├── model-table.tsx
│   │   │   ├── model-table-row.tsx
│   │   │   ├── model-card.tsx
│   │   │   ├── model-card-grid.tsx
│   │   │   └── column-customizer.tsx
│   │   │
│   │   ├── detail/
│   │   │   ├── model-header.tsx
│   │   │   ├── specs-section.tsx
│   │   │   ├── benchmark-chart.tsx
│   │   │   ├── pricing-section.tsx
│   │   │   ├── infra-section.tsx
│   │   │   └── similar-models.tsx
│   │   │
│   │   ├── compare/
│   │   │   ├── compare-grid.tsx
│   │   │   ├── compare-card.tsx
│   │   │   ├── compare-row.tsx
│   │   │   ├── price-diff.tsx
│   │   │   ├── highlight-winner.tsx
│   │   │   ├── share-button.tsx
│   │   │   └── empty-compare-slot.tsx
│   │   │
│   │   ├── recommendations/
│   │   │   ├── industry-category-list.tsx
│   │   │   ├── industry-category-card.tsx
│   │   │   ├── preset-card.tsx
│   │   │   ├── recommendation-list.tsx
│   │   │   └── fitness-score-bar.tsx
│   │   │
│   │   └── infra/
│   │       ├── gpu-table.tsx
│   │       └── gpu-card.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── connection.ts        # MongoDB 연결 (싱글톤)
│   │   │   └── models/
│   │   │       ├── model.ts         # Mongoose Model
│   │   │       ├── industry-preset.ts
│   │   │       ├── price-history.ts
│   │   │       └── gpu-reference.ts
│   │   │
│   │   ├── services/
│   │   │   ├── model.service.ts     # 모델 조회/필터/검색
│   │   │   ├── preset.service.ts    # 프리셋 조회
│   │   │   ├── recommendation.service.ts  # 적합도 계산 + 추천
│   │   │   └── gpu.service.ts       # GPU 레퍼런스 조회
│   │   │
│   │   ├── types/
│   │   │   ├── model.ts             # Model 타입 정의
│   │   │   ├── preset.ts
│   │   │   ├── api.ts               # ApiResponse<T> 등 공통 타입
│   │   │   └── gpu.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── format.ts            # 숫자/가격/날짜 포맷
│   │   │   ├── url.ts               # URL 파라미터 인코딩/디코딩
│   │   │   └── score.ts             # 점수 계산 유틸
│   │   │
│   │   └── constants/
│   │       ├── tiers.ts             # 티어 정의 (파라미터 범위)
│   │       ├── providers.ts         # 제공사 목록
│   │       └── benchmarks.ts        # 벤치마크 메타 (이름, 설명, 만점)
│   │
│   ├── hooks/
│   │   ├── use-compare.ts           # 비교 목록 관리
│   │   ├── use-filters.ts           # URL 기반 필터 상태
│   │   └── use-debounce.ts
│   │
│   └── contexts/
│       └── compare-context.tsx      # 비교 목록 전역 상태
│
├── public/
│   └── images/
│       └── providers/               # 제공사 로고
│
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 4. API 엔드포인트

### 4.1 공통 응답 형식

```typescript
// lib/types/api.ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
```

### 4.2 모델 API

#### `GET /api/models` — 모델 목록

```
Query Parameters:
  type?:      "commercial" | "open-source"
  provider?:  string          // 쉼표 구분 다중 선택 ("OpenAI,Anthropic")
  tier?:      string          // 쉼표 구분
  minPrice?:  number          // output 단가 하한
  maxPrice?:  number          // output 단가 상한
  search?:    string          // 모델명/제공사 텍스트 검색
  sort?:      string          // 정렬 필드 (e.g. "pricing.output", "scores.quality", "releaseDate")
  order?:     "asc" | "desc"  // 기본값 "asc"
  page?:      number          // 기본값 1
  limit?:     number          // 기본값 50

Response 200:
{
  "success": true,
  "data": [
    {
      "name": "Claude Sonnet 4.5",
      "slug": "claude-sonnet-4-5",
      "provider": "Anthropic",
      "type": "commercial",
      "tier": "flagship",
      "parameterSize": null,
      "contextWindow": 200000,
      "pricing": { "input": 3.0, "output": 15.0, "cachingDiscount": 0.9, "batchDiscount": 0.5 },
      "scores": { "quality": 92, "speed": 75, "reasoning": 90, "coding": 95, "multimodal": 85 },
      "languageScores": { "ko": 88, "en": 95, "ja": 82 },
      "releaseDate": "2025-02-24",
      "isNew": false
    }
    // ...
  ],
  "meta": { "total": 36, "page": 1, "limit": 50 }
}
```

#### `GET /api/models/[slug]` — 모델 상세

```
Response 200:
{
  "success": true,
  "data": {
    // Model 전체 필드 (benchmarks, infrastructure 포함)
    "name": "Llama 4 Maverick",
    "slug": "llama-4-maverick",
    "provider": "Meta",
    "type": "open-source",
    "tier": "flagship",
    "parameterSize": 400,
    "activeParameters": 17,
    "architecture": "moe",
    "contextWindow": 1048576,
    "license": "Llama 4 Community",
    "pricing": { "input": 0.2, "output": 0.6, "cachingDiscount": 0, "batchDiscount": 0 },
    "scores": { "quality": 80, "speed": 88, "reasoning": 72, "coding": 75, "multimodal": 78 },
    "languageScores": { "ko": 75, "en": 90, "ja": 72, "zh": 78 },
    "benchmarks": { "mmlu": 85.5, "gpqa": 69.8, "swe_bench": 42.0, "mgsm": 88.3 },
    "infrastructure": {
      "minGpu": "4x A100 80GB",
      "vramFp16": 280,
      "vramInt8": 140,
      "vramInt4": 70,
      "recommendedFramework": ["vLLM", "SGLang"],
      "estimatedTps": 45
    },
    "releaseDate": "2025-04-05",
    "isNew": false,
    "memo": "MoE 구조, 활성 파라미터 대비 높은 효율",
    "sourceUrls": ["https://llama.meta.com/"],
    "lastVerifiedAt": "2026-03-01",
    "similarModels": [
      { "slug": "qwen-3-235b-a22b", "name": "Qwen 3 235B-A22B", "provider": "Alibaba" }
    ]
  }
}

Response 404:
{ "success": false, "error": "모델을 찾을 수 없습니다." }
```

### 4.3 산업별 프리셋 API

#### `GET /api/industry-presets` — 프리셋 목록

```
Query Parameters:
  category?: string    // 카테고리 필터 (categorySlug)

Response 200:
{
  "success": true,
  "data": [
    {
      "category": "고객 서비스",
      "categorySlug": "customer-service",
      "taskType": "CS 챗봇, FAQ 자동 응답",
      "taskTypeSlug": "cs-chatbot",
      "weights": { "quality": 0.20, "speed": 0.25, "reasoning": 0.10, "cost": 0.20, "korean": 0.25 },
      "keyFactors": ["속도", "다국어", "비용"],
      "description": "빠른 응답과 다국어 지원이 중요한 고객 서비스 챗봇"
    }
    // ...
  ]
}
```

#### `GET /api/industry-presets/[categorySlug]` — 카테고리별 프리셋 + 추천

```
Response 200:
{
  "success": true,
  "data": {
    "category": "고객 서비스",
    "categorySlug": "customer-service",
    "presets": [
      {
        "taskType": "CS 챗봇, FAQ 자동 응답",
        "taskTypeSlug": "cs-chatbot",
        "weights": { ... },
        "keyFactors": ["속도", "다국어", "비용"],
        "recommendations": {
          "commercial": [
            { "modelSlug": "gpt-4o-mini", "reason": "저렴하고 빠른 응답, 다국어 우수" }
          ],
          "costEffective": [
            { "modelSlug": "gemini-2-0-flash", "reason": "무료 티어 제공, 속도 최상" }
          ],
          "openSource": [
            { "modelSlug": "llama-4-maverick", "reason": "무료 호스팅 가능, 다국어 성능 양호" }
          ]
        },
        "rankedModels": [
          { "slug": "gpt-4o-mini", "name": "GPT-4o Mini", "score": 87.5, "breakdown": { ... } },
          { "slug": "gemini-2-0-flash", "name": "Gemini 2.0 Flash", "score": 85.2, "breakdown": { ... } }
          // 상위 10개
        ]
      }
    ]
  }
}
```

`rankedModels`는 서버에서 가중 점수를 계산하여 반환한다. `breakdown`에 항목별 기여도를 포함하여 투명성을 확보한다.

### 4.4 GPU 레퍼런스 API

#### `GET /api/gpu` — GPU 목록

```
Query Parameters:
  category?: "datacenter" | "consumer" | "workstation"
  minVram?:  number

Response 200:
{
  "success": true,
  "data": [
    {
      "name": "NVIDIA A100 80GB",
      "vendor": "NVIDIA",
      "vram": 80,
      "memoryType": "HBM2e",
      "fp16Tflops": 312,
      "tdp": 300,
      "msrp": 10000,
      "cloudHourly": 1.10,
      "category": "datacenter",
      "notes": "가장 보편적인 AI 학습/추론 GPU"
    }
    // ...
  ]
}
```

---

## 5. 컴포넌트 구조

### 5.1 레이아웃

```
RootLayout (app/layout.tsx)
├── CompareProvider (contexts/compare-context.tsx)
│   ├── Header
│   │   ├── Nav (로고, 메뉴 링크)
│   │   └── CompareCountBadge
│   ├── {children} (페이지 콘텐츠)
│   ├── CompareFloatingBar (선택된 모델 표시, 비교 페이지 이동)
│   └── Footer
```

### 5.2 홈 페이지

```
HomePage (app/page.tsx) — Server Component
├── HeroSection
│   └── 핵심 가치 제안 + CTA 버튼 (탐색, 비교, 추천)
├── StatsOverview
│   └── 총 모델 수 | 산업 프리셋 수 | 최근 업데이트
├── NewModelsSection
│   └── ModelCard[] (isNew=true 필터, 최대 6개)
│       └── NewBadge + 모델명 + 제공사 + 핵심 스펙
└── QuickAccessCards
    └── 산업별 추천 | 인기 비교 | GPU 가이드 링크
```

### 5.3 모델 탐색 페이지

```
ExplorePage (app/explore/page.tsx) — Server Component (초기 데이터)
├── SearchInput (client)
├── FilterPanel (client)
│   ├── TypeFilter (commercial / open-source / all)
│   ├── ProviderFilter (체크박스)
│   ├── TierFilter (체크박스)
│   └── PriceRangeFilter (min/max 입력)
├── ViewToggle (client) — 테이블 / 카드 전환
├── [view === 'table']
│   └── ModelTable (client)
│       ├── ColumnCustomizer (표시 컬럼 선택)
│       ├── SortableHeader[]
│       └── ModelTableRow[]
│           ├── ModelTypeBadge
│           ├── NewBadge (조건부)
│           ├── ScoreBadge[]
│           ├── PriceDisplay
│           └── CompareCheckbox (비교 목록 추가/제거)
├── [view === 'card']
│   └── ModelCardGrid (client)
│       ├── TierGroupHeader (티어별 그룹 헤더 + 하드웨어 가이드)
│       └── ModelCard[]
│           ├── NewBadge (조건부)
│           ├── 주요 스펙 (파라미터, 컨텍스트, 가격)
│           ├── ScoreBadge[]
│           └── CompareCheckbox
└── Pagination
```

### 5.4 모델 상세 페이지

```
ModelDetailPage (app/explore/[slug]/page.tsx) — Server Component
├── ModelHeader
│   ├── 모델명 + 제공사 + 유형 배지 + NEW 배지
│   ├── CompareToggleButton
│   └── 출시일 + 최종 확인일
├── SpecsSection
│   └── 아키텍처, 파라미터, 컨텍스트 윈도우, 라이선스 등 그리드
├── ScoresSection
│   └── 범용 평가 + 다국어 평가 바 차트
├── BenchmarkChart (client — Recharts)
│   └── 벤치마크 원점수 바 차트
├── PricingSection
│   └── 토큰 단가 + 캐싱/배치 할인 정보 + 월비용 예시
├── InfraSection (오픈소스만 표시)
│   └── GPU 요구사항 + VRAM + 권장 프레임워크
└── SimilarModels
    └── ModelCard[] (같은 티어/가격대 모델 최대 4개)
```

### 5.5 비교 페이지

```
ComparePage (app/compare/page.tsx) — Client Component
├── ShareButton (URL 복사)
├── CompareGrid
│   └── CompareCard[] (최대 4개)
│       ├── ModelHeader (축약)
│       ├── 모델 제거 버튼
│       └── 모델 추가 드롭다운 (빈 슬롯)
├── CompareRow[] (항목별 비교)
│   ├── 기본 스펙 (파라미터, 컨텍스트, 아키텍처)
│   ├── 가격 (PriceDisplay + PriceDiff)
│   ├── 범용 평가 (ScoreBadge + HighlightWinner)
│   ├── 다국어 평가
│   ├── 벤치마크
│   └── 인프라 요구사항
└── EmptyCompareSlot (모델 미선택 시)
```

**비교 상태 관리:**
- URL query parameter: `?models=claude-sonnet-4-5,gpt-4o,gemini-2-0-pro`
- CompareContext에서 관리, URL과 양방향 동기화
- Phase 2에서 localStorage 세션 저장 추가

### 5.6 산업별 추천 페이지

```
RecommendationsPage (app/recommendations/page.tsx) — Server Component
└── IndustryCategoryList
    └── IndustryCategoryCard[] (5개 산업)
        ├── 카테고리명 + 아이콘
        ├── 업무 유형 수
        └── 링크 → /recommendations/[categorySlug]

RecommendationDetailPage (app/recommendations/[categorySlug]/page.tsx) — Server Component
├── 카테고리 헤더 (산업명 + 설명)
└── PresetCard[] (해당 산업의 업무 유형별)
    ├── 업무 유형명 + 핵심 가중 요소 태그
    ├── RecommendationList
    │   ├── 상용 추천 모델[]
    │   ├── 가성비 추천 모델[]
    │   └── 오픈소스 추천 모델[]
    └── FitnessScoreBar (rankedModels 상위 5개, 가로 바 차트)
```

### 5.7 인프라 가이드 페이지

```
InfraPage (app/infra/page.tsx) — Server Component
├── 페이지 헤더
├── GpuTable
│   ├── 카테고리별 탭 (데이터센터 / 컨슈머 / 워크스테이션)
│   └── 정렬 가능한 테이블 (VRAM, 가격, TDP 등)
└── GpuCard[] (모바일용 카드 뷰)
```

---

## 6. 데이터 흐름

### 6.1 서버 컴포넌트 데이터 페칭

```
[브라우저 요청]
    ↓
[Next.js Server Component]
    ↓
[서비스 레이어 (lib/services/)]
    ↓
[Mongoose Model (lib/db/models/)]
    ↓
[MongoDB]
```

서버 컴포넌트에서는 API Route를 거치지 않고 서비스 함수를 직접 호출한다.
API Route는 클라이언트 사이드 fetch와 외부 연동용으로 제공한다.

### 6.2 비교 상태 흐름

```
[사용자: 모델 선택]
    ↓
[CompareContext.addModel(slug)]
    ↓ 양방향 동기화
[URL searchParams 업데이트]
    ↓
[CompareFloatingBar 업데이트]
    ↓
[비교 페이지 이동 시 URL에서 slug 배열 읽기]
    ↓
[API/서비스로 모델 상세 조회]
    ↓
[CompareGrid 렌더링]
```

### 6.3 탐색 필터 흐름

```
[사용자: 필터 변경]
    ↓
[useFilters hook → URL searchParams 업데이트]
    ↓
[router.push (shallow) → 서버 컴포넌트 재렌더링]
    ↓
[서비스 레이어에서 필터 적용된 모델 목록 조회]
    ↓
[ModelTable/ModelCardGrid 렌더링]
```

### 6.4 산업별 추천 점수 흐름

```
[GET /api/industry-presets/[categorySlug]]
    ↓
[preset.service: 해당 카테고리 프리셋 조회]
    ↓
[recommendation.service: 전체 모델 조회]
    ↓
[각 모델 × 각 프리셋 → calculateFitnessScore()]
    ↓
[점수순 정렬 → 상위 10개 + breakdown 반환]
```

---

## 7. 시드 데이터 전략

### 7.1 파일 구조

```json
// data/models.json (예시)
[
  {
    "name": "Claude Sonnet 4.5",
    "slug": "claude-sonnet-4-5",
    "provider": "Anthropic",
    "type": "commercial",
    "tier": "flagship",
    "parameterSize": null,
    "architecture": "dense",
    "contextWindow": 200000,
    "maxOutput": 16384,
    "license": "Proprietary",
    "pricing": { "input": 3.0, "output": 15.0, "cachingDiscount": 0.9, "batchDiscount": 0.5 },
    "scores": { "quality": 92, "speed": 75, "reasoning": 90, "coding": 95, "multimodal": 85 },
    "languageScores": { "ko": 88, "en": 95, "ja": 82, "zh": 84 },
    "benchmarks": { "mmlu": 90.2, "gpqa": 79.8, "swe_bench": 70.3, "aime": 80.4, "hle": 20.1 },
    "infrastructure": null,
    "releaseDate": "2025-02-24",
    "memo": "Anthropic의 최신 코딩 특화 모델",
    "sourceUrls": ["https://docs.anthropic.com/"],
    "colorCode": "#D97706"
  }
]
```

### 7.2 Import 스크립트

```typescript
// scripts/seed.ts
// 실행: npx tsx scripts/seed.ts
//
// 1. MongoDB 연결
// 2. 기존 데이터 drop (--force 플래그 필요)
// 3. models.json → Model 컬렉션 upsert (slug 기준)
// 4. industry-presets.json → IndustryPreset 컬렉션 upsert
// 5. gpu-reference.json → GpuReference 컬렉션 upsert
// 6. 각 모델의 현재 가격 → PriceHistory 초기 레코드 생성
// 7. 결과 요약 출력
```

upsert 방식으로 기존 데이터를 덮어쓰되 삭제하지 않는다.
`--force` 플래그를 붙이면 전체 drop 후 재삽입한다.

---

## 8. 배포 구성

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

### 환경 변수

```env
# .env.example
MONGODB_URI=mongodb://user:pass@host:27017/atom-models
```

### next.config.ts 핵심 설정

```typescript
{
  output: 'standalone',          // Docker 최적화
  images: { unoptimized: true }, // 별도 이미지 최적화 불필요
}
```

---

## 9. Phase 2~3 확장 포인트

| 기능 | 확장 방식 |
|------|-----------|
| 레이더 차트 (F3.2) | `components/compare/radar-chart.tsx` 추가, Recharts RadarChart 사용 |
| PDF/PNG 내보내기 (F3.3) | `lib/services/export.service.ts` + html2canvas/jsPDF |
| 비용 시뮬레이터 (F4) | `app/simulator/page.tsx` + `components/simulator/` 디렉토리 |
| VRAM 계산기 (F5.1) | `components/infra/vram-calculator.tsx` 클라이언트 컴포넌트 |
| 동적 추천 (F6.3) | `POST /api/recommendations/calculate` 엔드포인트 추가 |
| 라우팅 전략 (F6.4) | `components/recommendations/routing-strategy.tsx` |
| 비교 세션 저장 (F8.2) | `hooks/use-compare.ts`에 localStorage 연동 추가 |
| 사용량 랭킹 (F7.1) | `lib/services/openrouter.service.ts` 외부 API 연동 |
| 가격 히스토리 차트 (F7.3) | `components/detail/price-history-chart.tsx` + Recharts LineChart |
| 영어 UI (Phase 3) | next-intl 또는 next-i18next 도입 |

---

## 10. 기술 결정 요약

| 결정 | 선택 | 근거 |
|------|------|------|
| DB 스키마 유연성 | Mongoose Map 타입 | 모델별 벤치마크/언어 필드가 다름 |
| 데이터 관리 | JSON 시드 + upsert 스크립트 | 관리자 UI 없이도 데이터 갱신 가능 |
| 상태 관리 | React Context + URL params | 전역 상태 최소화, URL 공유 가능 |
| 데이터 페칭 | 서버 컴포넌트 → 서비스 직접 호출 | API 오버헤드 제거, SEO 최적화 |
| 적합도 점수 | 서버 사이드 실시간 계산 | 36개 모델 × 20개 프리셋 = 경량 연산 |
| NEW 배지 | 가상 필드 (30일 기준) | 별도 관리 불필요, 자동 만료 |
| 비교 상태 | URL query params | 공유 가능 + 브라우저 히스토리 호환 |
