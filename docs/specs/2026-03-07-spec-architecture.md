# atom-models 아키텍처 설계서

**버전:** v1.5
**최초 작성:** 2026.03.07
**최종 갱신:** 2026.03.11
**범위:** Phase 1 구현 완료 상태 + Phase 1.5 스키마 고도화 반영

---

## 1. 설계 원칙

- **시드 데이터 기반**: 관리자 UI 없이 JSON + import 스크립트로 데이터 관리
- **인증 없음**: 도구 용도이므로 전체 공개
- **서버 컴포넌트 우선**: SEO + 초기 로딩 최적화를 위해 가능한 한 서버에서 렌더링
- **URL 기반 상태**: 필터, 비교 선택 등 주요 상태를 URL에 인코딩하여 공유 가능
- **서비스 레이어 분리**: Mongoose 직접 호출 대신 서비스 함수를 통해 데이터 접근
- **비정규화 캐시**: 벤치마크/가격은 별도 컬렉션 + Model에 최신값 캐시 (조회 성능 보장)

---

## 2. 기술 스택

| 레이어 | 기술 | 근거 |
|--------|------|------|
| 프레임워크 | Next.js (App Router) | SEO + API Routes + 다수 페이지 라우팅 |
| DB | MongoDB (공용 인스턴스) | 스키마 유연성 + 자동 갱신 대비 + 공용 DB 활용 |
| ORM | Mongoose | MongoDB 스키마 관리, 가상 필드, 인덱스 |
| UI 컴포넌트 | shadcn/ui | 테마 활용, Sidebar 컴포넌트 |
| 스타일링 | Tailwind CSS | 유틸리티 기반 스타일링 |
| 차트 | Recharts | React 네이티브 차트 라이브러리 |
| 배포 | Railway | Docker, standalone output 모드 |
| 외부 API | OpenRouter | Playground 멀티모델 스트리밍 게이트웨이 |

---

## 3. DB 스키마

### 3.1 컬렉션 구조 (9개)

```
Core
├── providers              ← 프로바이더 마스터
└── models                 ← 모델 마스터 (벤치마크/가격 캐시 포함)

Model 하위
├── model_benchmarks       ← 벤치마크 점수 이력 (Long format)
└── model_pricing          ← 가격 이력 (effective_from/to)

참조 데이터
├── ref_benchmarks         ← 벤치마크 정의 (11개)
└── ref_gpus               ← GPU 스펙 참조 (11개)

BVA
├── bva_dimensions         ← BVA 평가 차원 (8개)
└── bva_presets            ← 산업별 프리셋 (12개)

Playground
└── playground_sessions    ← 채팅 세션
```

### 3.2 Enum 정의

| Name | Values |
|------|--------|
| model_type | `commercial`, `open-source` |
| model_tier | `flagship`, `mid`, `light` |
| model_status | `active`, `preview`, `deprecated`, `scheduled-deprecation` |
| model_architecture | `dense`, `moe` |
| provider_type | `commercial`, `commercial+oss`, `oss` |
| modality | `text`, `image`, `audio`, `video`, `code`, `embedding` |
| benchmark_category | `지식`, `추론`, `코딩`, `한국어`, `신뢰성`, `도구호출`, `명령어수행`, `긴문서처리` |
| pricing_type | `api`, `self-hosted`, `api-dashscope`, `api-friendli` |
| gpu_category | `datacenter`, `consumer`, `workstation` |
| bva_volume_tier | `under-10k`, `10k-100k`, `100k-1m`, `over-1m` |

### 3.3 providers

```typescript
const ProviderSchema = new Schema({
  _id:            String,                        // "OPENAI", "ANTHROPIC", ...
  name:           { type: String, required: true },  // 표시명
  name_en:        { type: String, required: true },  // 영문명
  type:           { type: String, enum: ['commercial', 'commercial+oss', 'oss'], required: true },
  headquarters:   String,
  founded:        Number,                        // 설립연도
  website:        String,
  api_endpoint:   String,
  description:    String,
  color_code:     String,                        // "#10A37F"
}, { timestamps: true });
```

### 3.4 models

```typescript
const ModelSchema = new Schema({
  // === L1: 식별 정보 ===
  name:              { type: String, required: true, unique: true },
  slug:              { type: String, required: true, unique: true, index: true },
  provider_id:       { type: String, ref: 'Provider', required: true, index: true },
  family:            String,           // "GPT-5", "Claude 4", "Qwen 3"
  variant:           String,           // "5.4 Pro", "Opus", "235B-A22B"
  type:              { type: String, enum: ['commercial', 'open-source'], required: true, index: true },
  tier:              { type: String, enum: ['flagship', 'mid', 'light'], index: true },
  tags:              [String],         // ["reasoning", "coding", "multimodal", ...]
  release_date:      { type: Date, required: true },
  license:           String,
  is_opensource:     { type: Boolean, required: true },
  status:            { type: String, enum: ['active', 'preview', 'deprecated', 'scheduled-deprecation'], required: true },
  deprecation_date:  Date,

  // === L2: 기술 스펙 ===
  param_total:       Number,           // 전체 파라미터 (십억 단위)
  param_active:      Number,           // MoE 활성 파라미터
  architecture:      { type: String, enum: ['dense', 'moe'] },
  ctx_input:         Number,           // 최대 입력 토큰
  ctx_output:        Number,           // 최대 출력 토큰
  training_cutoff:   Date,
  languages:         [String],         // ["en", "ko", "ja", "zh", "multi"]

  modality_input:    [String],         // ["text", "image", "audio"]
  modality_output:   [String],         // ["text", "image", "code"]

  capabilities: {
    function_calling:   { type: Boolean, default: false },
    structured_output:  { type: Boolean, default: false },
    streaming:          { type: Boolean, default: false },
    system_prompt:      { type: Boolean, default: false },
    vision:             { type: Boolean, default: false },
    tool_use:           { type: Boolean, default: false },
    fine_tuning:        { type: Boolean, default: false },
    batch_api:          { type: Boolean, default: false },
    thinking_mode:      { type: Boolean, default: false },
  },

  // === L4: 비용 캐시 (비정규화) ===
  pricing: {
    input_per_1m:   Number,            // USD / 1M input tokens
    output_per_1m:  Number,            // USD / 1M output tokens
    pricing_type:   String,            // "api", "self-hosted" 등
  },

  // === L3: 벤치마크 캐시 (비정규화) ===
  benchmarks: {
    type: Map,
    of: Schema.Types.Mixed,
    // { mmlu: 87.5, gpqa: 72.3, swe_bench: 49.0, ... } (11개 키)
  },

  // === L5: 운영 ===
  compliance: {
    soc2:            { type: Boolean, default: false },
    hipaa:           { type: Boolean, default: false },
    gdpr:            { type: Boolean, default: false },
    on_premise:      { type: Boolean, default: false },
    data_exclusion:  { type: Boolean, default: false },
  },
  avg_tps:           Number,           // 평균 TPS (null 허용)
  ttft_ms:           Number,           // TTFT ms (null 허용)
  regions:           [String],         // ["US", "EU", "KR", ...]

  // === 인프라 (OSS 전용) ===
  infrastructure: {
    min_gpu:                String,
    vram_fp16:              Number,
    vram_fp8:               Number,
    vram_int8:              Number,
    vram_int4:              Number,
    vram_q6k:               Number,
    vram_q5k:               Number,
    vram_q4k_m:             Number,
    vram_q3k:               Number,
    vram_q2k:               Number,
    recommended_framework:  [String],
    estimated_tps:          Number,
  },

  // === 메타 ===
  open_router_model_id:  String,
  memo:                  String,
  source_urls:           [String],
  last_verified_at:      { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// 가상 필드: NEW 배지 (30일 이내 출시)
ModelSchema.virtual('is_recently_released').get(function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.release_date >= thirtyDaysAgo;
});

// 인덱스
ModelSchema.index({ provider_id: 1, type: 1 });
ModelSchema.index({ type: 1, tier: 1 });
ModelSchema.index({ tags: 1 });
ModelSchema.index({ status: 1 });
ModelSchema.index({ family: 1 });
ModelSchema.index({ is_opensource: 1 });
ModelSchema.index({ release_date: -1 });
ModelSchema.index({ 'pricing.input_per_1m': 1 });
ModelSchema.index({ 'capabilities.function_calling': 1 });
ModelSchema.index({ 'capabilities.vision': 1 });
ModelSchema.index({ modality_input: 1 });
ModelSchema.index({ regions: 1 });
ModelSchema.index({ name: 'text', family: 'text' });
```

### 3.5 ref_benchmarks

```typescript
const RefBenchmarkSchema = new Schema({
  _id:            String,              // "gpqa", "bfcl", ...
  name:           { type: String, required: true },   // "GPQA"
  display_name:   { type: String, required: true },   // "대학원 수준 과학 추론"
  category:       { type: String, required: true },   // "추론"
  max_score:      { type: Number, required: true },   // 100
  description:    { type: String, required: true },
  source:         { type: String, required: true },   // 출처 기관
  url:            String,
});

// 11개 벤치마크
// mmlu(지식), gpqa(추론), aime(추론), hle(추론), swe_bench(코딩),
// kmmlu(한국어), mgsm(한국어), truthfulqa(신뢰성), bfcl(도구호출),
// ifeval(명령어수행), ruler(긴문서처리)
```

### 3.6 model_benchmarks

```typescript
const ModelBenchmarkSchema = new Schema({
  model_id:       { type: String, ref: 'Model', required: true, index: true },
  benchmark_id:   { type: String, ref: 'RefBenchmark', required: true, index: true },
  score:          { type: Number, required: true },
  methodology:    String,              // "5-shot", "0-shot"
  source:         String,              // 출처
  measured_date:  Date,
  notes:          String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
});

ModelBenchmarkSchema.index({ model_id: 1, benchmark_id: 1, measured_date: -1 }, { unique: true });
ModelBenchmarkSchema.index({ benchmark_id: 1, score: -1 });
ModelBenchmarkSchema.index({ model_id: 1, score: -1 });
```

### 3.7 model_pricing

```typescript
const ModelPricingSchema = new Schema({
  model_id:       { type: String, ref: 'Model', required: true, index: true },
  pricing_type:   { type: String, enum: ['api', 'self-hosted', 'api-dashscope', 'api-friendli'], required: true },
  currency:       { type: String, default: 'USD' },
  effective_from: { type: Date, required: true },
  effective_to:   Date,                // null = 현행 가격

  // API 가격
  input_per_1m:   Number,              // USD / 1M input tokens
  output_per_1m:  Number,              // USD / 1M output tokens
  cached_input:   Number,
  batch_input:    Number,
  batch_output:   Number,

  // 셀프호스팅 비용
  gpu_requirement: String,             // "8xA100 80GB"
  cost_per_hour:   Number,             // USD/hr

  notes:          String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
});

ModelPricingSchema.index({ model_id: 1, effective_from: -1 });
ModelPricingSchema.index({ model_id: 1, effective_to: 1 });
ModelPricingSchema.index({ pricing_type: 1 });
```

### 3.8 bva_dimensions (확장: 4 → 8)

```typescript
const BvaDimensionSchema = new Schema({
  _id:                 String,         // "reasoning", "reliability", ...
  key:                 { type: String, required: true, unique: true },
  display_name:        { type: String, required: true },
  description:         { type: String, required: true },
  formula:             [{
    benchmark:   String,               // ref_benchmarks._id 참조
    weight:      Number,               // 0~1, 합계 1.0
  }],
  formula_explanation: { type: String, required: true },
}, { timestamps: true });

// 8개 차원
// reasoning:    GPQA 40% + AIME 30% + HLE 30%
// korean:       KMMLU 70% + MGSM 30%
// coding:       SWE-bench 100%
// knowledge:    MMLU 70% + GPQA 30%
// reliability:  TruthfulQA 100%
// tool_use:     BFCL 100%
// instruction:  IFEval 100%
// long_context: RULER 100%
```

### 3.9 bva_presets

```typescript
const BvaPresetSchema = new Schema({
  category:       { type: String, required: true, index: true },
  category_slug:  { type: String, required: true, index: true },
  task_type:      { type: String, required: true },
  task_type_slug: { type: String, required: true },

  // 가중치 (합계 100)
  weights: {
    reasoning:     { type: Number, default: 0 },
    korean:        { type: Number, default: 0 },
    coding:        { type: Number, default: 0 },
    knowledge:     { type: Number, default: 0 },
    reliability:   { type: Number, default: 0 },
    tool_use:      { type: Number, default: 0 },
    instruction:   { type: Number, default: 0 },
    long_context:  { type: Number, default: 0 },
    cost:          { type: Number, default: 0 },
  },

  recommendations: {
    commercial:     [{ model_slug: String, reason: String }],
    cost_effective: [{ model_slug: String, reason: String }],
    open_source:    [{ model_slug: String, reason: String }],
  },

  description:  String,
  key_factors:  [String],
}, { timestamps: true });

BvaPresetSchema.index({ category_slug: 1, task_type_slug: 1 }, { unique: true });
```

### 3.10 ref_gpus (기존 유지)

```typescript
const RefGpuSchema = new Schema({
  name:          { type: String, required: true, unique: true },
  slug:          { type: String, required: true, unique: true },
  vendor:        String,
  vram:          Number,               // GB
  memory_type:   String,               // "HBM3", "GDDR6", ...
  fp16_tflops:   Number,
  int8_tops:     Number,
  tdp:           Number,               // Watts
  msrp:          Number,               // USD
  cloud_hourly:  Number,               // USD/hr
  category:      { type: String, enum: ['datacenter', 'consumer', 'workstation'] },
  notes:         String,
}, { timestamps: true });
```

### 3.11 playground_sessions (기존 유지)

```typescript
const PlaygroundSessionSchema = new Schema({
  title:    { type: String, required: true },
  models:   [{
    model_id:             { type: Schema.Types.ObjectId, ref: 'Model', required: true },
    model_name:           String,
    provider:             String,
    open_router_model_id: String,
    color_code:           { type: String, default: '#888888' },
    parameters: {
      temperature:      Number,
      max_tokens:       Number,
      top_p:            Number,
    },
  }],
  system_prompt:      { type: String, default: '' },
  messages:           [{
    role:      { type: String, enum: ['user', 'assistant'], required: true },
    content:   { type: String, required: true },
    model_id:  { type: Schema.Types.ObjectId, ref: 'Model' },
    metrics: {
      ttft:           Number,
      total_time:     Number,
      tps:            Number,
      input_tokens:   Number,
      output_tokens:  Number,
      estimated_cost: Number,
    },
    created_at: { type: Date, default: Date.now },
  }],
  default_parameters: {
    temperature:       { type: Number, default: 0.7 },
    max_tokens:        { type: Number, default: 4096 },
    top_p:             { type: Number, default: 1.0 },
  },
}, { timestamps: true });

PlaygroundSessionSchema.index({ createdAt: -1 });
```

### 3.12 관계도

```
providers (8)
  └──< models (50)
         ├──< model_benchmarks (50 x 11)
         ├──< model_pricing (50+)
         ├──  → bva_presets.recommendations (model_slug)
         └──  → playground_sessions.models (model_id)

ref_benchmarks (11)
  ├──< model_benchmarks (benchmark_id)
  └──  → bva_dimensions.formula (benchmark key)

bva_dimensions (8)
  └──  → bva_presets.weights (key 매핑)

ref_gpus (11)
  └──  → models.infrastructure.min_gpu (name 참조)
```

---

## 4. 프로젝트 디렉토리 구조

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
│   ├── providers.json               # 프로바이더 마스터 (8개)
│   ├── models.json                  # 모델 마스터 (50개)
│   ├── model-benchmarks.json        # 벤치마크 점수 Long format
│   ├── model-pricing.json           # 가격 이력
│   ├── ref-benchmarks.json          # 벤치마크 정의 (11개)
│   ├── ref-gpus.json                # GPU 스펙 (11개)
│   ├── bva-dimensions.json          # BVA 차원 (8개)
│   └── bva-presets.json             # 산업별 프리셋 (12개)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               # 루트 레이아웃 (Sidebar)
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
│   │   ├── bva/
│   │   │   ├── page.tsx             # BVA 입력 폼
│   │   │   └── result/
│   │   │       └── page.tsx         # BVA 결과 리포트
│   │   │
│   │   ├── methodology/
│   │   │   └── page.tsx             # BVA 방법론
│   │   │
│   │   ├── recommendations/
│   │   │   ├── page.tsx             # 산업 카테고리 목록
│   │   │   └── [categorySlug]/
│   │   │       └── page.tsx         # 산업별 추천 상세
│   │   │
│   │   ├── playground/
│   │   │   └── page.tsx             # Playground
│   │   │
│   │   ├── infra/
│   │   │   └── page.tsx             # GPU 레퍼런스
│   │   │
│   │   └── api/
│   │       ├── models/
│   │       │   ├── route.ts         # GET: 모델 목록
│   │       │   └── [slug]/
│   │       │       └── route.ts     # GET: 모델 상세
│   │       │
│   │       ├── bva/
│   │       │   └── route.ts         # POST: BVA 리포트 생성
│   │       │
│   │       ├── industry-presets/
│   │       │   ├── route.ts         # GET: 프리셋 목록
│   │       │   └── [categorySlug]/
│   │       │       └── route.ts     # GET: 카테고리별 프리셋
│   │       │
│   │       ├── playground/
│   │       │   ├── chat/
│   │       │   │   └── route.ts     # POST: SSE 스트리밍 채팅
│   │       │   └── sessions/
│   │       │       ├── route.ts     # GET/POST: 세션 목록/생성
│   │       │       └── [id]/
│   │       │           └── route.ts # GET/PUT/DELETE: 세션 관리
│   │       │
│   │       └── gpu/
│   │           └── route.ts         # GET: GPU 레퍼런스
│   │
│   ├── components/
│   │   ├── layout/                  # 사이드바, 네비게이션
│   │   ├── shared/                  # 공통 컴포넌트
│   │   ├── home/                    # 홈 페이지
│   │   ├── explore/                 # 모델 탐색
│   │   ├── detail/                  # 모델 상세
│   │   ├── compare/                 # 모델 비교
│   │   ├── bva/                     # BVA 리포트
│   │   ├── recommendations/         # 산업별 추천
│   │   ├── playground/              # Playground
│   │   └── infra/                   # GPU 가이드
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── connection.ts        # MongoDB 연결 (싱글톤)
│   │   │   └── models/              # Mongoose 모델 정의
│   │   │       ├── provider.ts
│   │   │       ├── model.ts
│   │   │       ├── model-benchmark.ts
│   │   │       ├── model-pricing.ts
│   │   │       ├── ref-benchmark.ts
│   │   │       ├── ref-gpu.ts
│   │   │       ├── bva-dimension.ts
│   │   │       ├── bva-preset.ts
│   │   │       └── playground-session.ts
│   │   │
│   │   ├── services/
│   │   │   ├── model.service.ts
│   │   │   ├── provider.service.ts
│   │   │   ├── bva.service.ts
│   │   │   ├── recommendation.service.ts
│   │   │   ├── preset.service.ts
│   │   │   ├── gpu.service.ts
│   │   │   ├── playground.service.ts
│   │   │   └── openrouter.service.ts
│   │   │
│   │   ├── types/
│   │   │   ├── model.ts
│   │   │   ├── provider.ts
│   │   │   ├── bva.ts
│   │   │   ├── preset.ts
│   │   │   ├── gpu.ts
│   │   │   ├── playground.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── format.ts
│   │   │   ├── url.ts
│   │   │   └── score.ts
│   │   │
│   │   └── constants/
│   │       ├── benchmarks.ts
│   │       ├── providers.ts
│   │       ├── tiers.ts
│   │       ├── bva-dimensions.ts
│   │       └── quantizations.ts
│   │
│   ├── hooks/
│   │   ├── use-compare.ts
│   │   ├── use-filters.ts
│   │   ├── use-streaming-chat.ts
│   │   └── use-debounce.ts
│   │
│   └── contexts/
│       └── compare-context.tsx
│
├── public/
│   └── images/
│       └── providers/               # 제공사 로고
│
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── jest.config.ts
├── package.json
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 5. API 엔드포인트

### 5.1 공통 응답 형식

```typescript
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

### 5.2 모델 API

#### `GET /api/models` — 모델 목록

```
Query Parameters:
  type?:       "commercial" | "open-source"
  provider?:   string          // provider_id (쉼표 구분)
  tier?:       string          // 쉼표 구분 ("flagship,mid")
  tags?:       string          // 쉼표 구분 ("reasoning,coding")
  status?:     string          // "active" (기본값)
  minPrice?:   number          // output 단가 하한
  maxPrice?:   number          // output 단가 상한
  search?:     string          // 모델명/패밀리 텍스트 검색
  sort?:       string          // 정렬 필드
  order?:      "asc" | "desc"
  page?:       number
  limit?:      number

Response 200:
{
  "success": true,
  "data": [
    {
      "name": "Claude 4 Opus",
      "slug": "claude-4-opus",
      "provider_id": "ANTHROPIC",
      "family": "Claude 4",
      "variant": "Opus",
      "type": "commercial",
      "tier": "flagship",
      "tags": ["reasoning", "coding"],
      "status": "active",
      "param_total": null,
      "ctx_input": 200000,
      "ctx_output": 16384,
      "pricing": { "input_per_1m": 15.0, "output_per_1m": 75.0, "pricing_type": "api" },
      "benchmarks": { "mmlu": 90.2, "gpqa": 79.8, "swe_bench": 70.3, ... },
      "capabilities": { "function_calling": true, "streaming": true, ... },
      "release_date": "2025-12-01",
      "is_recently_released": false
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 50 }
}
```

#### `GET /api/models/[slug]` — 모델 상세

```
Response 200:
{
  "success": true,
  "data": {
    // Model 전체 필드 + provider 정보 populate
    // + similarModels (같은 등급/가격대)
  }
}
```

### 5.3 BVA API

#### `POST /api/bva` — BVA 리포트 생성

```
Request Body:
{
  "industry": "개발/IT",
  "taskType": "코드 리뷰",
  "volume": "100k-1m",
  "languages": ["ko", "en"],
  "tone": "technical",
  "security": {
    "soc2": true,
    "hipaa": false,
    "gdpr": false,
    "onPremise": false,
    "dataExclusion": false
  }
}

Response 200:
{
  "success": true,
  "data": {
    "commercial": [
      {
        "slug": "claude-4-opus",
        "name": "Claude 4 Opus",
        "provider": "Anthropic",
        "type": "commercial",
        "score": 87.5,
        "breakdown": {
          "reasoning": 85.2,
          "korean": 78.0,
          "coding": 92.1,
          "knowledge": 88.5,
          "reliability": 76.3,
          "tool_use": 81.0,
          "instruction": 89.2,
          "long_context": 72.5,
          "cost": 45.0
        }
      }
    ],
    "openSource": [...],
    "complianceChecks": [...],
    "costEstimate": { ... }
  }
}
```

### 5.4 Playground API

#### `POST /api/playground/chat` — SSE 스트리밍

```
Request Body:
{
  "sessionId": "...",
  "modelId": "...",
  "messages": [...],
  "parameters": { "temperature": 0.7, "maxTokens": 4096 }
}

Response: Server-Sent Events (text/event-stream)
  data: {"type": "delta", "content": "..."}
  data: {"type": "metrics", "ttft": 150, "tps": 45.2, ...}
  data: {"type": "done"}
```

### 5.5 기타 API

- `GET /api/industry-presets` — 프리셋 목록
- `GET /api/industry-presets/[categorySlug]` — 카테고리별 프리셋 + 랭킹
- `GET /api/gpu` — GPU 레퍼런스
- `GET/POST /api/playground/sessions` — 세션 관리

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

### 6.2 BVA 점수 계산 흐름

```
[POST /api/bva (사용자 프로필)]
    ↓
[bva.service: 프리셋 매칭 → 가중치 결정]
    ↓
[전체 models 조회 (벤치마크 캐시 활용)]
    ↓
[각 모델 × 8차원 → dimensionScore 계산]
    ↓
[가중합산 → 총점 → 상용/OSS 분리 랭킹]
    ↓
[complianceChecks 필터링]
    ↓
[diversify (프로바이더당 max 2)]
    ↓
[BVA 리포트 반환]
```

### 6.3 Playground 스트리밍 흐름

```
[클라이언트: 메시지 전송 (최대 3개 모델 병렬)]
    ↓
[POST /api/playground/chat (모델별 요청)]
    ↓
[openrouter.service: OpenRouter API SSE 호출]
    ↓
[delta.reasoning / delta.content 분리]
    ↓
[메트릭 측정 (TTFT, TPS, 비용)]
    ↓
[SSE → 클라이언트]
    ↓
[세션 자동 저장]
```

### 6.4 비정규화 캐시 동기화

```
[시드 실행 (scripts/seed.ts)]
    ↓
[model_benchmarks 삽입]
    ↓
[각 모델별 최신 벤치마크 → models.benchmarks 캐시 업데이트]
    ↓
[model_pricing 삽입]
    ↓
[effective_to=null 가격 → models.pricing 캐시 업데이트]
```

시드 스크립트가 정규화된 데이터 삽입 후 자동으로 캐시를 동기화한다.

---

## 7. 시드 데이터 전략

### 7.1 파일 구조

| 파일 | 레코드 수 | 용도 |
|------|-----------|------|
| `data/providers.json` | 8 | 프로바이더 마스터 |
| `data/models.json` | 50 | 모델 마스터 (인프라 포함) |
| `data/model-benchmarks.json` | ~550 | 50 모델 x 11 벤치마크 (null 제외) |
| `data/model-pricing.json` | ~50 | 현행 가격 (effective_to=null) |
| `data/ref-benchmarks.json` | 11 | 벤치마크 정의 |
| `data/ref-gpus.json` | 11 | GPU 스펙 |
| `data/bva-dimensions.json` | 8 | BVA 차원 정의 |
| `data/bva-presets.json` | 12 | 산업별 프리셋 |

### 7.2 Import 스크립트

```
실행: npx tsx scripts/seed.ts [--force]

순서:
1. MongoDB 연결
2. --force 시 전체 컬렉션 drop
3. providers → 삽입/upsert
4. ref_benchmarks → 삽입/upsert
5. ref_gpus → 삽입/upsert
6. models → 삽입/upsert
7. model_benchmarks → 삽입/upsert
8. model_pricing → 삽입/upsert
9. models.benchmarks 캐시 동기화
10. models.pricing 캐시 동기화
11. bva_dimensions → 삽입/upsert
12. bva_presets → 삽입/upsert
13. 결과 요약 출력
```

`--force`: 전체 drop 후 재삽입 (스키마 변경 시 권장)
기본 모드: upsert (기존 데이터 유지, 변경분만 갱신)

### 7.3 환경별 DB

| 환경 | DB | 용도 |
|------|-----|------|
| 개발 | `192.168.219.108:27017/atom-models` | 스키마 개선 작업 |
| 프로덕션 | Railway MongoDB (`ballast.proxy.rlwy.net:35663`) | 라이브 서비스 |

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
MONGODB_URI=mongodb://user:pass@host:27017/atom-models
OPENROUTER_API_KEY=sk-or-v1-...
```

### next.config.ts

```typescript
{
  output: 'standalone',
  images: { unoptimized: true },
}
```

---

## 9. Phase 2~3 확장 포인트

| 기능 | 확장 방식 |
|------|-----------|
| 레이더 차트 (F3.2) | `components/compare/radar-chart.tsx`, Recharts RadarChart |
| PDF/PNG 내보내기 (F3.3) | `lib/services/export.service.ts` + html2canvas/jsPDF |
| 비용 시뮬레이터 (F4) | `app/simulator/page.tsx` + `components/simulator/` |
| VRAM 계산기 (F5.1) | `components/infra/vram-calculator.tsx` |
| 동적 추천 (F6) | `POST /api/recommendations/calculate` |
| 라우팅 전략 (F6) | `components/recommendations/routing-strategy.tsx` |
| 비교 세션 저장 (F9.3) | `hooks/use-compare.ts`에 localStorage 연동 |
| 가격 히스토리 차트 (F8.2) | `components/detail/price-history-chart.tsx`, model_pricing 쿼리 |
| 영어 UI (Phase 3) | next-intl 도입 |

---

## 10. 기술 결정 요약

| 결정 | 선택 | 근거 |
|------|------|------|
| 모델 분류 체계 | type + tier(3단계) + tags | 사업 모델/성능 등급/용도를 분리하여 다축 필터링 |
| 벤치마크 정규화 | 별도 컬렉션 + Model 캐시 | 시점별 이력 관리 + 조회 성능 양립 |
| 가격 이력 | effective_from/to + Model 캐시 | 가격 변동 추적 + 빈번한 가격 조회 성능 |
| Provider 정규화 | 별도 컬렉션 (풀 스펙) | Provider 상세 페이지, 메타데이터 관리 |
| capabilities vs tags | 분리 관리 | tags=용도 분류, capabilities=기능 지원 여부 (역할 다름) |
| BVA 차원 | 8차원 (기존 4 + 신규 4) | 도구호출, 명령어수행, 신뢰성, 롱컨텍스트 평가 커버 |
| 벤치마크 수 | 11개 (기존 7 + 신규 4) | 새 차원 커버 + 데이터 확보 가능한 것만 선별 |
| events 컬렉션 | 미포함 (YAGNI) | 소비처 없는 운영 데이터 불필요 |
| 컬렉션 네이밍 | model_*, ref_*, bva_*, playground_* | 소속 관계 접두어로 가독성 확보 |
| 데이터 관리 | JSON 시드 + upsert/force 스크립트 | 관리자 UI 없이 데이터 갱신 |
| 상태 관리 | React Context + URL params | 전역 상태 최소화, URL 공유 가능 |
| 데이터 페칭 | 서버 컴포넌트 → 서비스 직접 호출 | API 오버헤드 제거, SEO 최적화 |
| Playground | OpenRouter SSE | 단일 게이트웨이로 멀티모델 스트리밍 |
| NEW 배지 | 가상 필드 (30일 기준) | 별도 관리 불필요, 자동 만료 |
