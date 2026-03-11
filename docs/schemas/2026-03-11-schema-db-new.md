# LLM 모델 DB 스키마

## Layer 정보
Layer 1: 모델 식별 정보 (Identity)
가장 기본이지만 의외로 설계가 까다로운 부분입니다. LLM은 같은 이름이라도 버전, 변형(variant), 양자화 수준에 따라 완전히 다른 모델이 되거든요.
수집 항목으로는 모델명, provider(제공사), 모델 패밀리, 버전/릴리즈 날짜, 라이선스 유형, 오픈소스 여부 등이 있습니다. 여기서 핵심 설계 포인트는 "GPT-4o"와 "GPT-4o-mini"를 같은 패밀리의 다른 모델로 볼 것인지, 아예 별개 모델로 볼 것인지입니다. 추천 시스템에서는 패밀리 내 업/다운그레이드 경로를 제시할 수 있어야 하므로 패밀리-모델-변형(variant) 3계층 구조를 추천합니다.
오픈소스 모델의 경우 양자화 버전(Q4, Q8, FP16 등)까지 별도 엔트리로 관리해야 합니다. 같은 Llama 3.1 70B라도 FP16과 Q4_K_M은 성능과 비용이 전혀 다르니까요.

Layer 2: 기술 스펙 (Technical Specifications)
추천 로직에서 필터링 조건으로 쓰이는 데이터입니다.
파라미터 수, 아키텍처(Transformer, MoE 등), 컨텍스트 윈도우 크기(input/output 각각), 학습 데이터 cutoff 날짜, 지원 언어 목록, 멀티모달 지원 여부(이미지/오디오/비디오 각각), function calling/tool use 지원 여부, structured output 지원 여부, 스트리밍 지원 여부 등을 포함합니다.
여기서 고민이 필요한 것은 컨텍스트 윈도우인데, 단순히 "128K 지원"이라는 숫자만으론 부족합니다. 실제로는 "긴 컨텍스트에서 성능이 얼마나 유지되는가"(needle-in-a-haystack 성능)가 더 중요한 경우가 많아요. 스펙 값과 실측 값을 분리해서 관리하는 것이 좋습니다.

Layer 3: 성능 벤치마크 (Performance)
가장 데이터가 풍부하면서도 가장 해석이 어려운 영역입니다. 크게 세 가지 차원으로 나눠 생각해야 합니다.
범용 벤치마크: MMLU, MMLU-Pro, ARC, HellaSwag, TruthfulQA 등으로, 모델의 일반 지능을 측정합니다. 모델 간 대략적인 tier를 나누는 데 유용하지만, 실제 태스크 적합도와는 괴리가 있을 수 있어요.
태스크별 벤치마크: 코딩(HumanEval, SWE-bench), 수학(GSM8K, MATH), 추론(BBH, ARC-Challenge), 한국어(KoBEST, KMMLU), 요약, 번역 등 특정 영역 성능입니다. 추천 시스템의 핵심 데이터로, 사용자가 "코딩용 모델 추천해줘"라고 할 때 직접 활용됩니다.
Arena/ELO 스코어: Chatbot Arena 같은 인간 평가 기반 점수입니다. 벤치마크 점수로 포착되지 않는 "체감 품질"을 반영해줍니다.
설계 시 주의할 점이 있습니다. 벤치마크 점수는 출처(자체 보고 vs 독립 측정)와 측정 시점에 따라 크게 달라질 수 있으므로, 점수와 함께 반드시 **source(출처), measured_date(측정일), methodology(few-shot/zero-shot 등)**를 같이 저장해야 합니다. 또한 벤치마크는 계속 새로 나오고 사라지므로, 하드코딩보다는 벤치마크 카탈로그를 별도 테이블로 분리하는 게 확장성 면에서 좋습니다.

Layer 4: 비용 구조 (Cost)
비용-성능 최적화의 핵심인데, 상용 API와 오픈소스의 비용 구조가 완전히 다르다는 게 설계의 난점입니다.
상용 API 모델: input token 단가, output token 단가, 캐시 할인율, 배치 API 할인율, 무료 tier 한도, rate limit(RPM/TPM) 등을 수집합니다. 가격이 수시로 변하므로 **이력 관리(effective_from, effective_to)**가 필수입니다.
오픈소스 모델 (셀프 호스팅): 필요 GPU 사양(VRAM), 클라우드 호스팅 예상 비용(시간당), 추론 속도(tokens/sec by hardware), 양자화에 따른 성능-비용 트레이드오프 등을 다룹니다.
오픈소스 모델 (호스팅 서비스): Together AI, Fireworks, Groq 등 서드파티 호스팅의 가격도 별도로 추적하면, 같은 오픈소스 모델이라도 "직접 호스팅 vs 서비스 이용"의 비교가 가능해집니다.
여기서 핵심 파생 지표는 "달러당 벤치마크 점수" 또는 "100만 토큰당 비용 대비 MMLU 점수" 같은 효율성 메트릭인데, 이건 원시 데이터만 잘 수집하면 나중에 계산할 수 있으므로 원시 데이터의 정확성과 최신성에 집중하는 게 맞습니다.

Layer 5: 운영 특성 (Operational)
실제 프로덕션에서의 사용 가능성을 판단하는 데이터입니다.
평균 응답 지연시간(TTFT, TPS), API 안정성/가용률(uptime), 데이터 프라이버시 정책(학습 데이터로 사용 여부), 지역 제한(중국에서 접근 가능한지 등), SLA 유무, fine-tuning 지원 여부와 비용 등이 포함됩니다.
특히 추천 시스템에서 "우리 회사는 데이터가 한국 밖으로 나가면 안 된다"는 제약이 있으면, 이 레이어의 데이터가 필터링 조건으로 바로 작동해야 합니다.

Layer 6: 메타/시계열 데이터 (Meta & Temporal)
장기적으로 가장 가치가 높은 레이어입니다. 모델 출시일과 EOL(서비스 종료) 예정일, 가격 변동 이력, 벤치마크 점수 변동 이력(모델 업데이트 시), 시장 점유율/인기도 추이(GitHub stars, API 호출량 등)를 추적합니다.
이 데이터가 있으면 "이 모델이 6개월 후에도 쓸 만할까?" 같은 지속가능성 판단이 가능해지고, 가격 하락 트렌드를 예측해서 비용 최적화에 반영할 수 있습니다.

## Entity 구조

```
providers              ← L0
models                 ← L1 + L2(embedded) + L5(embedded)
benchmark_definitions  ← 벤치마크 메타 (16건)
benchmarks             ← L3
pricing                ← L4
events                 ← L6
```

---

## Enum

| Name | Values |
|------|--------|
| provider_type | `Commercial`, `Commercial+OSS`, `OSS` |
| model_type | `flagship`, `mid`, `light`, `reasoning`, `coding`, `multimodal`, `embedding`, `safety`, `video`, `vision`, `oss-flagship`, `oss-mid`, `oss-light`, `oss-specialist` |
| model_status | `Active`, `Preview`, `Deprecated`, `Scheduled-Deprecation` |
| benchmark_category | `정확성/환각`, `한국어`, `명령어수행`, `도구호출`, `긴문서처리`, `추론`, `코딩` |
| pricing_type | `API`, `API (DashScope)`, `API (Friendli)`, `Self-hosted` |
| event_type | `출시`, `가격변경`, `지원종료예정`, `지원종료`, `정책변경`, `규제` |
| modality | `text`, `image`, `audio`, `video`, `code`, `embedding` |

---

## 1. providers

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | PK | `OPENAI`, `ANTHROPIC`, ... |
| provider_name | String | Y | 표시명 |
| name_en | String | Y | 영문명 |
| type | Enum(provider_type) | Y | |
| headquarters | String | | 본사 소재지 |
| founded | Integer | | 설립연도 |
| website | String | | |
| api_endpoint | String | | |
| description | String | | |
| created_at | DateTime | Y | |
| updated_at | DateTime | Y | |

---

## 2. models

### 2-1. Root (L1 — 모델 식별 정보)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | PK | `OAI-GPT54`, `ANT-CLAUDE4O`, ... |
| model_name | String | Y | 표시용 모델명 |
| provider_id | String | FK → providers.id | Y | |
| family | String | | 모델 패밀리 (GPT-5, Claude, Gemini, ...) |
| variant | String | | 패밀리 내 변형 식별자 |
| model_type | Enum(model_type) | Y | |
| release_date | Date | | |
| license | String | | `Proprietary`, `Apache 2.0`, `MIT`, ... |
| is_opensource | Boolean | Y | |
| param_total | Integer(64) | | 전체 파라미터 수. 비공개=null |
| param_active | Integer(64) | | 활성 파라미터 수 (MoE) |
| architecture | String | | `Dense`, `MoE (128 experts)`, ... |
| ctx_input | Integer | | 최대 입력 컨텍스트 (tokens) |
| ctx_output | Integer | | 최대 출력 컨텍스트 (tokens) |
| training_cutoff | Date | | 학습 데이터 기준일 |
| status | Enum(model_status) | Y | |
| deprecation_date | Date | | Scheduled-Deprecation인 경우 |
| notes | String | | |
| created_at | DateTime | Y | |
| updated_at | DateTime | Y | |

### 2-2. tech_specs (L2 — 기술 스펙, embedded)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| modality_input | Array\<Enum(modality)\> | | `["text", "image"]` |
| modality_output | Array\<Enum(modality)\> | | `["text"]` |
| capabilities.function_calling | Boolean | | |
| capabilities.structured_output | Boolean | | |
| capabilities.streaming | Boolean | | |
| capabilities.system_prompt | Boolean | | |
| capabilities.vision | Boolean | | |
| capabilities.tool_use | Boolean | | |
| capabilities.fine_tuning | Boolean | | |
| capabilities.batch_api | Boolean | | |
| capabilities.thinking_mode | Boolean | | |
| tokenizer | String | | `o200k_base`, `cl100k_base`, ... |
| quantization | String | | |
| languages | Array\<String\> | | `["en", "ko", "ja", "zh", "multi"]` |
| api_endpoint | String | | API 엔드포인트 경로 |
| notes | String | | |

### 2-3. operations (L5 — 운영 특성, embedded)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| avg_tps | Integer | | 평균 초당 토큰 처리량 |
| ttft_ms | Integer | | Time to First Token (ms) |
| uptime_sla | String | | `99.9%`, `99.95%`, ... |
| data_privacy | String | | 데이터 처리 정책 |
| training_data_usage | String | | 학습 데이터 활용 정책 |
| regions | Array\<String\> | | `["US", "EU", "KR", ...]` |
| compliances | Array\<String\> | | `["SOC2 Type2", "ISO27001", "GDPR"]` |
| deprecation_policy | String | | 지원 종료 정책 |
| notes | String | | |

---

## 3. benchmark_definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | PK | `MMLU-Pro`, `GPQA-Diamond`, ... |
| benchmark_name | String | Y | |
| category | Enum(benchmark_category) | Y | |
| max_score | Decimal | Y | 만점 기준 (100, 10, ...) |
| description | String | | |
| url | String | | 공식 리더보드 URL |

**초기 데이터 (16건):**

| id | category | max_score |
|----|----------|-----------|
| TruthfulQA | 정확성/환각 | 100 |
| HaluEval | 정확성/환각 | 100 |
| MMLU-Pro | 정확성/환각 | 100 |
| KMMLU | 한국어 | 100 |
| KLUE | 한국어 | 100 |
| KorNAT | 한국어 | 100 |
| IFEval | 명령어수행 | 100 |
| MT-Bench | 명령어수행 | 10 |
| BFCL | 도구호출 | 100 |
| API-Bank | 도구호출 | 100 |
| RULER | 긴문서처리 | 100 |
| LongBench | 긴문서처리 | 100 |
| GPQA-Diamond | 추론 | 100 |
| ARC-Challenge | 추론 | 100 |
| HumanEval | 코딩 | 100 |
| MBPP | 코딩 | 100 |
| SWE-bench-Verified | 코딩 | 100 |

---

## 4. benchmarks

모델별 벤치마크 점수. Long format.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Auto | PK | |
| model_id | String | FK → models.id | Y | |
| benchmark_id | String | FK → benchmark_definitions.id | Y | |
| category | Enum(benchmark_category) | Y | 비정규화 (조회 성능용) |
| score | Decimal | Y | |
| max_score | Decimal | Y | 비정규화 |
| methodology | String | | `5-shot`, `0-shot`, ... |
| source | String | | 출처 |
| measured_date | Date | | 측정일 |
| notes | String | | |
| created_at | DateTime | Y | |

**Unique:** `(model_id, benchmark_id, measured_date)`

---

## 5. pricing

가격 이력. `effective_to = null`이 현행 가격.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Auto | PK | |
| model_id | String | FK → models.id | Y | |
| pricing_type | Enum(pricing_type) | Y | |
| currency | String | Y | `USD` |
| effective_from | Date | Y | 적용 시작일 |
| effective_to | Date | | null=현행 가격 |
| api.input_per_1m | Decimal | | USD / 1M input tokens |
| api.output_per_1m | Decimal | | USD / 1M output tokens |
| api.cached_input | Decimal | | |
| api.batch_input | Decimal | | |
| api.batch_output | Decimal | | |
| hosting.gpu_requirement | String | | `8×A100 80GB` |
| hosting.cost_per_hour | Decimal | | USD/hr |
| notes | String | | |
| created_at | DateTime | Y | |

---

## 6. events

모델 생애주기 이벤트 로그. Append-only.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Auto | PK | |
| model_id | String | FK → models.id | Y | |
| event_type | Enum(event_type) | Y | |
| event_date | Date | Y | |
| change.field | String | | 변경 대상 필드 |
| change.old_value | String | | |
| change.new_value | String | | |
| source | String | | 출처 URL |
| notes | String | | |
| created_at | DateTime | Y | |

---

## 관계

| From | To | Cardinality | 전략 |
|------|----|-------------|------|
| providers | models | 1:N | 참조 (provider_id) |
| models | tech_specs | 1:1 | 임베딩 |
| models | operations | 1:1 | 임베딩 |
| models | benchmarks | 1:N | 참조 (model_id) |
| models | pricing | 1:N | 참조 (model_id) |
| models | events | 1:N | 참조 (model_id) |
| benchmark_definitions | benchmarks | 1:N | 참조 (benchmark_id) |

---

## 인덱스

### models

| Fields | Type |
|--------|------|
| provider_id | Single |
| model_type | Single |
| status | Single |
| family | Single |
| is_opensource | Single |
| release_date (DESC) | Single |
| tech_specs.modality_input | Multikey |
| tech_specs.capabilities.function_calling | Single |
| tech_specs.capabilities.vision | Single |
| operations.regions | Multikey |
| operations.compliances | Multikey |

### benchmarks

| Fields | Type |
|--------|------|
| model_id, benchmark_id, measured_date (DESC) | Compound, Unique |
| model_id | Single |
| benchmark_id | Single |
| category, score (DESC) | Compound |
| model_id, category, score (DESC) | Compound |

### pricing

| Fields | Type |
|--------|------|
| model_id, effective_from (DESC) | Compound |
| model_id, effective_to | Compound |
| pricing_type | Single |
| api.input_per_1m | Single |

### events

| Fields | Type |
|--------|------|
| model_id, event_date (DESC) | Compound |
| event_type | Single |
| event_date (DESC) | Single |

---