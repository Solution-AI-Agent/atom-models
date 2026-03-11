# CRM 가상상담사 LLM BVA 평가 — 데이터 스키마 정의서

> 버전: 3.0 | 기준일: 2026.03 | 작성: Architecture팀

---

## 1. 개요

본 문서는 CRM 가상상담사 구축을 위한 LLM BVA(Business Value Assessment) 평가 프레임워크에서 사용되는 로우 데이터의 스키마를 정의합니다. 상용(Commercial) 모델과 오픈소스(OSS) 모델 각각에 대해 수집 항목, 데이터 타입, 입력 규칙, 출처를 명시합니다. 모든 컬럼명은 DB/코드에서 바로 사용할 수 있도록 snake_case로 정의합니다.

---

## 2. 공통 스키마 (Commercial + OSS)

### 2.1 기본 정보

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 입력 예시 | 출처 |
|---|-------------------|--------|-------------|------|------|-----------|------|
| 1 | `model_name` | 모델명 | VARCHAR(100) | Y | 모델의 공식 명칭 | `GPT-5.4` | Provider 공식 발표 |
| 2 | `provider` | 제공사 | VARCHAR(50) | Y | 모델 개발사/제공사 | `OpenAI` | Provider 공식 |
| 3 | `release_date` | 출시일 | VARCHAR(7) | Y | 최초 GA 또는 Preview 출시일 (YYYY.MM) | `2026.03` | Release Note |
| 4 | `category` | 분류 | ENUM | Y | `global` / `korea` / `oss` | `global` | - |
| 5 | `parameters` | 파라미터 | VARCHAR(50) | N | 모델 파라미터 수 (공개 시) | `400B MoE` | 기술 리포트 |

### 2.2 성능 지표

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 단위 | 입력 규칙 |
|---|-------------------|--------|-------------|------|------|------|-----------|
| 6 | `context_window_k` | 컨텍스트 윈도우 | INTEGER | Y | 최대 컨텍스트 길이 | K (천 토큰) | 숫자만 입력. 예: `128`, `1000` |
| 7 | `mmlu_score` | MMLU(%) | DECIMAL(5,2) | Y | MMLU 벤치마크 점수 | % | 0.00 ~ 100.00 |
| 8 | `kmmlu_score` | KMMLU(%) | DECIMAL(5,2) | Y | Korean MMLU 벤치마크 점수 | % | 0.00 ~ 100.00. 미측정 시 `NULL` |
| 9 | `hallucination_rate` | 환각률(%) | VARCHAR(10) | Y | Hallucination Rate | % | 숫자 또는 `low` / `medium` / `high` |
| 10 | `ttft_sec` | TTFT(초) | DECIMAL(4,2) | Y | Time To First Token | 초 | 소수점 2자리까지 |
| 11 | `throughput_tps` | 처리속도 | INTEGER | Y | Output token 생성 속도 | tok/s | API 기준 측정값 |
| 12 | `max_output_tokens` | Max Output Tokens | INTEGER | Y | 단일 응답 최대 출력 토큰 수 | tokens | `4096`, `8192`, `32768` 등 |

### 2.3 비용 정보

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 단위 | 입력 규칙 |
|---|-------------------|--------|-------------|------|------|------|-----------|
| 13 | `input_dollar_per_m` | Input $/1M | DECIMAL(8,3) | Y* | 입력 토큰 가격 | USD/1M tokens | 소수점 3자리. 비공개 시 `NULL` |
| 14 | `output_dollar_per_m` | Output $/1M | DECIMAL(8,3) | Y* | 출력 토큰 가격 | USD/1M tokens | 소수점 3자리. 비공개 시 `NULL` |
| 15 | `rate_limit_tpm` | Rate Limit (TPM) | VARCHAR(30) | Y | 분당 토큰 처리 한도 | tokens/min | Tier별 상이 시 `Tier3:2M` 형태 |
| 16 | `rate_limit_rpm` | Rate Limit (RPM) | VARCHAR(30) | N | 분당 요청 수 한도 | requests/min | Tier별 상이 시 명시 |

> *비공개 모델(HyperCLOVA X, Exaone 등)은 `NULL`로 기입, 별도 비고 컬럼에 `별도문의` 표기

### 2.4 기능 지원

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 입력 규칙 |
|---|-------------------|--------|-------------|------|------|-----------|
| 17 | `function_calling` | Function Calling | ENUM | Y | 외부 API/Tool 호출 기능 지원 | `supported` / `unsupported` / `limited` |
| 18 | `json_mode` | JSON Mode | ENUM | Y | 구조화된 JSON 출력 보장 | `supported` / `unsupported` / `limited` |
| 19 | `streaming` | Streaming | ENUM | Y | 스트리밍 응답 지원 | `supported` / `unsupported` |
| 20 | `fine_tuning` | Fine-tuning | VARCHAR(50) | Y | 파인튜닝 지원 방식 | `full` / `lora` / `prompt_tuning` / `none` / 복수 시 `,`로 구분 |
| 21 | `multimodal` | 멀티모달 | ENUM | Y | 이미지/오디오 입력 지원 | `supported` / `unsupported` |
| 22 | `embedding_model` | Embedding 연계 | VARCHAR(50) | Y | 동일 제공사 임베딩 모델명 | 모델명 또는 `none`. 예: `text-embedding-3-large` |

### 2.5 한국어 역량

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 입력 규칙 |
|---|-------------------|--------|-------------|------|------|-----------|
| 23 | `korean_support` | 한국어 지원 | ENUM | Y | 한국어 처리 수준 | `excellent` / `supported` / `limited` / `unsupported` |

### 2.6 보안 / 컴플라이언스

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 입력 규칙 |
|---|-------------------|--------|-------------|------|------|-----------|
| 24 | `soc2_certified` | SOC2 | ENUM | Y | SOC2 Type II 인증 여부 | `certified` / `not_certified` / `separate` |
| 25 | `hipaa_baa` | HIPAA BAA | ENUM | Y | HIPAA BAA 체결 가능 여부 | `available` / `unavailable` / `separate` |
| 26 | `data_residency_kr` | 데이터 레지던시(한국) | VARCHAR(50) | Y | 한국 리전 데이터 저장 가능 여부 | `aws_seoul` / `gcp_seoul` / `kr_only` / `separate` / `none` 등 |
| 27 | `sla_percent` | SLA(%) | DECIMAL(5,2) | Y | 서비스 가용성 보장 수준 | % 형태. 예: `99.90`, `99.95` |
| 28 | `guardrails_builtin` | Guardrails 내장 | ENUM | Y | 콘텐츠 필터/안전장치 내장 여부 | `supported` / `unsupported` / `limited` |
| 29 | `pii_masking` | PII 마스킹 | ENUM | Y | 개인정보 자동 마스킹 기능 | `supported` / `unsupported` / `limited` |

### 2.7 BVA 평가 점수 (10점 만점)

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 가중치 | 입력 규칙 |
|---|-------------------|--------|-------------|------|------|--------|-----------|
| 30 | `bva_response_quality` | 응답 품질 | TINYINT | Y | 응답 정확성·완결성·논리성 | 25% | 1 ~ 10 |
| 31 | `bva_cost_efficiency` | 비용 효율성 | TINYINT | Y | TCO 기반 가성비 | 20% | 1 ~ 10 |
| 32 | `bva_korean_naturalness` | 한국어 자연스러움 | TINYINT | Y | 존댓말·어미·맞춤법 | 15% | 1 ~ 10 |
| 33 | `bva_domain_expertise` | 도메인 전문성 | TINYINT | Y | 업종별 시나리오 대응력 | 10% | 1 ~ 10 |
| 34 | `bva_response_speed` | 응답 속도 | TINYINT | Y | TTFT + 처리속도 종합 | 10% | 1 ~ 10 |
| 35 | `bva_stability` | 안정성 | TINYINT | Y | SLA 가용성·장애 빈도 | 5% | 1 ~ 10 |
| 36 | `bva_security_compliance` | 보안/컴플라이언스 | TINYINT | Y | 인증·데이터 레지던시 종합 | 10% | 1 ~ 10 |
| 37 | `bva_anti_hallucination` | 환각 방지 | TINYINT | Y | 환각률 기반 | 5% | 1 ~ 10 |
| - | `bva_weighted_score` | BVA 가중합 | DECIMAL(4,2) | Y | **산출 컬럼** (자동 계산) | 100% | 0.00 ~ 10.00 |

---

## 3. OSS 전용 추가 컬럼

OSS 모델은 위 공통 스키마에 더해 아래 컬럼이 추가됩니다.

| # | snake_case 컬럼명 | 표시명 | 데이터 타입 | 필수 | 설명 | 입력 규칙 |
|---|-------------------|--------|-------------|------|------|-----------|
| O1 | `license_type` | 라이선스 | VARCHAR(30) | Y | 오픈소스 라이선스 유형 | `MIT` / `Apache-2.0` / `Llama-4` / `Gemma` 등 |
| O2 | `self_host_difficulty` | 셀프호스팅 난이도 | ENUM | Y | 자체 서버 구축 난이도 | `high` / `medium` / `low` |
| O3 | `self_host_gpu_spec` | 셀프호스팅 GPU | VARCHAR(30) | Y | 최소 GPU 요구사양 | 예: `8x_a100_80gb` |
| O4 | `self_host_monthly_usd` | 셀프호스팅 월비용(USD) | INTEGER | Y | 클라우드 GPU 기준 월 추정 비용 | 숫자만. 예: `12000` |
| O5 | `self_host_monthly_krw` | 셀프호스팅 월비용(KRW) | INTEGER | Y | 원화 환산 | 숫자만. 예: `16200000` |

---

## 4. 컬럼 매핑 참조표

엑셀 표시명과 snake_case 간 빠른 매핑입니다.

| 엑셀 표시명 | snake_case | DB 타입 |
|-------------|-----------|---------|
| 모델명 | `model_name` | VARCHAR(100) |
| 제공사 | `provider` | VARCHAR(50) |
| 출시일 | `release_date` | VARCHAR(7) |
| 분류 | `category` | ENUM |
| 파라미터 | `parameters` | VARCHAR(50) |
| 컨텍스트(K) | `context_window_k` | INTEGER |
| MMLU(%) | `mmlu_score` | DECIMAL(5,2) |
| KMMLU(%) | `kmmlu_score` | DECIMAL(5,2) |
| 환각률(%) | `hallucination_rate` | VARCHAR(10) |
| TTFT(초) | `ttft_sec` | DECIMAL(4,2) |
| 처리속도(tok/s) | `throughput_tps` | INTEGER |
| Max Output Tokens | `max_output_tokens` | INTEGER |
| Input $/1M | `input_dollar_per_m` | DECIMAL(8,3) |
| Output $/1M | `output_dollar_per_m` | DECIMAL(8,3) |
| Rate Limit (TPM) | `rate_limit_tpm` | VARCHAR(30) |
| Rate Limit (RPM) | `rate_limit_rpm` | VARCHAR(30) |
| Function Calling | `function_calling` | ENUM |
| JSON Mode | `json_mode` | ENUM |
| Streaming | `streaming` | ENUM |
| Fine-tuning | `fine_tuning` | VARCHAR(50) |
| 멀티모달 | `multimodal` | ENUM |
| Embedding 연계 | `embedding_model` | VARCHAR(50) |
| 한국어 지원 | `korean_support` | ENUM |
| SOC2 | `soc2_certified` | ENUM |
| HIPAA BAA | `hipaa_baa` | ENUM |
| 데이터 레지던시(한국) | `data_residency_kr` | VARCHAR(50) |
| SLA(%) | `sla_percent` | DECIMAL(5,2) |
| Guardrails 내장 | `guardrails_builtin` | ENUM |
| PII 마스킹 | `pii_masking` | ENUM |
| 응답 품질 | `bva_response_quality` | TINYINT |
| 비용 효율성 | `bva_cost_efficiency` | TINYINT |
| 한국어 자연스러움 | `bva_korean_naturalness` | TINYINT |
| 도메인 전문성 | `bva_domain_expertise` | TINYINT |
| 응답 속도 | `bva_response_speed` | TINYINT |
| 안정성 | `bva_stability` | TINYINT |
| 보안/컴플라이언스 | `bva_security_compliance` | TINYINT |
| 환각 방지 | `bva_anti_hallucination` | TINYINT |
| BVA 가중합 | `bva_weighted_score` | DECIMAL(4,2) |
| 라이선스 | `license_type` | VARCHAR(30) |
| 셀프호스팅 난이도 | `self_host_difficulty` | ENUM |
| 셀프호스팅 GPU | `self_host_gpu_spec` | VARCHAR(30) |
| 셀프호스팅 월비용(USD) | `self_host_monthly_usd` | INTEGER |
| 셀프호스팅 월비용(KRW) | `self_host_monthly_krw` | INTEGER |

---

## 5. BVA 가중치 정의

| snake_case 컬럼명 | 표시명 | 가중치 | 배점 | 가중 만점 |
|-------------------|--------|--------|------|-----------|
| `bva_response_quality` | 응답 품질 | 0.25 | 10 | 2.50 |
| `bva_cost_efficiency` | 비용 효율성 | 0.20 | 10 | 2.00 |
| `bva_korean_naturalness` | 한국어 자연스러움 | 0.15 | 10 | 1.50 |
| `bva_domain_expertise` | 도메인 전문성 | 0.10 | 10 | 1.00 |
| `bva_response_speed` | 응답 속도 | 0.10 | 10 | 1.00 |
| `bva_stability` | 안정성 | 0.05 | 10 | 0.50 |
| `bva_security_compliance` | 보안/컴플라이언스 | 0.10 | 10 | 1.00 |
| `bva_anti_hallucination` | 환각 방지 | 0.05 | 10 | 0.50 |
| **합계** | | **1.00** | - | **10.00** |

**산출식:**

```sql
bva_weighted_score =
    bva_response_quality     * 0.25
  + bva_cost_efficiency      * 0.20
  + bva_korean_naturalness   * 0.15
  + bva_domain_expertise     * 0.10
  + bva_response_speed       * 0.10
  + bva_stability            * 0.05
  + bva_security_compliance  * 0.10
  + bva_anti_hallucination   * 0.05
```

---

## 6. TCO (Total Cost of Ownership) 산정 모델

### 6.1 기준 시나리오

| snake_case | 표시명 | 값 | 비고 |
|------------|--------|-----|------|
| `monthly_consultations` | 월 상담건수 | 100,000건 | 기준 시나리오 |
| `tokens_per_input` | 건당 입력 토큰 | ~500 tokens | 질문 + 맥락(이전 대화, 고객 정보) |
| `tokens_per_output` | 건당 출력 토큰 | ~300 tokens | 응답 평균 길이 |
| `monthly_input_total` | 월 입력 합계 | 50,000,000 tokens (50M) | 100K × 500 |
| `monthly_output_total` | 월 출력 합계 | 30,000,000 tokens (30M) | 100K × 300 |
| `exchange_rate_usd_krw` | 환율 | 1,350 | 2026.03 기준 |

### 6.2 계산식

```sql
-- API 기반 TCO
monthly_api_cost_usd = (input_dollar_per_m * 50) + (output_dollar_per_m * 30)
monthly_api_cost_krw = monthly_api_cost_usd * exchange_rate_usd_krw
```

### 6.3 OSS 셀프호스팅 TCO

| snake_case | 표시명 | 설명 | 비고 |
|------------|--------|------|------|
| `self_host_gpu_cost` | GPU 서버 비용 | 클라우드 GPU 인스턴스 월 비용 | AWS/GCP/Azure 기준 |
| `self_host_ops_cost` | 운영 인력 | MLOps 엔지니어 인건비 (0.5~1명분) | 장애 대응, 모니터링 |
| `self_host_storage_cost` | 스토리지 | 모델 가중치 + 로그 저장 | 모델 크기에 비례 |
| `self_host_network_cost` | 네트워크 | API 게이트웨이, 로드밸런서 | 트래픽에 비례 |

---

## 7. 엑셀 시트 구조

### 7.1 Commercial 엑셀 (`LLM_Commercial_비교평가.xlsx`)

| 시트명 | 내용 |
|--------|------|
| OpenAI | GPT-5.4, GPT-5.3 Codex, GPT-5.2, GPT-5 mini, GPT-5 nano, O3 Pro |
| Anthropic | Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5 |
| Google | Gemini 3.1 Pro, Gemini 3 Pro, Gemini 2.5 Pro, Gemini 2.0 Flash |
| xAI | Grok 4, Grok 4 Fast |
| Amazon | Nova Pro 2, Nova Micro |
| 한국 모델 | HyperCLOVA X THINK/DASH, SOLAR Pro 2, Exaone 4.0 32B |
| BVA 평가 매트릭스 | 전 모델 BVA 점수 매트릭스 + `bva_weighted_score` |
| TCO 시뮬레이션 | `monthly_api_cost_usd`, `monthly_api_cost_krw` + 가성비 등급 |

### 7.2 OSS 엑셀 (`LLM_OSS_비교평가.xlsx`)

| 시트명 | 내용 |
|--------|------|
| Meta | Llama 4 Maverick, Llama 4 Scout |
| DeepSeek | DeepSeek-R1, DeepSeek-V3.2 |
| Alibaba | Qwen 3 235B, Qwen 3 32B, Qwen3 Coder |
| Mistral | Mistral Large 3, Mistral Medium 3 |
| Google & Microsoft | Gemma 3 27B, Phi-4 |
| BVA 평가 매트릭스 | 전 모델 BVA 점수 매트릭스 + `bva_weighted_score` |
| 셀프호스팅 비용 | `self_host_gpu_spec`, `self_host_monthly_usd/krw` |
| API TCO 시뮬레이션 | API 이용 시 월 비용 비교 |

---

## 8. ENUM 값 정의

### 8.1 공통 ENUM

| snake_case 컬럼명 | 허용 값 | 설명 |
|-------------------|---------|------|
| `category` | `global`, `korea`, `oss` | 모델 분류 |
| `korean_support` | `excellent`, `supported`, `limited`, `unsupported` | ◎/O/△/X 매핑 |
| `function_calling` | `supported`, `unsupported`, `limited` | FC 지원 수준 |
| `json_mode` | `supported`, `unsupported`, `limited` | Structured Output |
| `streaming` | `supported`, `unsupported` | 스트리밍 |
| `multimodal` | `supported`, `unsupported` | 멀티모달 입력 |
| `soc2_certified` | `certified`, `not_certified`, `separate` | SOC2 인증 |
| `hipaa_baa` | `available`, `unavailable`, `separate` | HIPAA BAA |
| `guardrails_builtin` | `supported`, `unsupported`, `limited` | 안전장치 |
| `pii_masking` | `supported`, `unsupported`, `limited` | PII 마스킹 |

### 8.2 OSS 전용 ENUM

| snake_case 컬럼명 | 허용 값 | 설명 |
|-------------------|---------|------|
| `self_host_difficulty` | `high`, `medium`, `low` | GPU 8대+/2~4대/1대 |

### 8.3 NULL 처리 규칙

| 상황 | DB 값 | 엑셀 표시 | 비고 |
|------|-------|-----------|------|
| 가격 비공개 | `NULL` | `별도문의` | HyperCLOVA X, Exaone 등 |
| 미측정 | `NULL` | `N/A` | 벤치마크 미수행 |
| 해당 없음 | `NULL` | `-` | OSS 모델의 SLA 등 |

### 8.4 출처 표기

모든 수치 데이터는 아래 우선순위의 출처를 명기해야 합니다:

1. Provider 공식 문서 / API Pricing Page
2. 공식 기술 리포트 (Technical Report)
3. 독립 벤치마크 (Chatbot Arena, LMSYS 등)
4. 추정치 (PoC 검증 필요 표기)

---

## 9. DDL 참고 (MySQL 기준)

```sql
CREATE TABLE llm_models (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    -- 2.1 기본 정보
    model_name              VARCHAR(100) NOT NULL,
    provider                VARCHAR(50)  NOT NULL,
    release_date            VARCHAR(7)   NOT NULL COMMENT 'YYYY.MM',
    category                ENUM('global','korea','oss') NOT NULL,
    parameters              VARCHAR(50)  NULL,
    -- 2.2 성능 지표
    context_window_k        INT          NOT NULL,
    mmlu_score              DECIMAL(5,2) NOT NULL,
    kmmlu_score             DECIMAL(5,2) NULL,
    hallucination_rate      VARCHAR(10)  NOT NULL,
    ttft_sec                DECIMAL(4,2) NOT NULL,
    throughput_tps          INT          NOT NULL,
    max_output_tokens       INT          NOT NULL,
    -- 2.3 비용 정보
    input_dollar_per_m      DECIMAL(8,3) NULL,
    output_dollar_per_m     DECIMAL(8,3) NULL,
    rate_limit_tpm          VARCHAR(30)  NOT NULL,
    rate_limit_rpm          VARCHAR(30)  NULL,
    -- 2.4 기능 지원
    function_calling        ENUM('supported','unsupported','limited') NOT NULL,
    json_mode               ENUM('supported','unsupported','limited') NOT NULL,
    streaming               ENUM('supported','unsupported') NOT NULL,
    fine_tuning             VARCHAR(50)  NOT NULL COMMENT 'full,lora,prompt_tuning,none',
    multimodal              ENUM('supported','unsupported') NOT NULL,
    embedding_model         VARCHAR(50)  NOT NULL DEFAULT 'none',
    -- 2.5 한국어
    korean_support          ENUM('excellent','supported','limited','unsupported') NOT NULL,
    -- 2.6 보안/컴플라이언스
    soc2_certified          ENUM('certified','not_certified','separate') NOT NULL,
    hipaa_baa               ENUM('available','unavailable','separate') NOT NULL,
    data_residency_kr       VARCHAR(50)  NOT NULL,
    sla_percent             DECIMAL(5,2) NOT NULL,
    guardrails_builtin      ENUM('supported','unsupported','limited') NOT NULL,
    pii_masking             ENUM('supported','unsupported','limited') NOT NULL,
    -- 2.7 BVA 점수
    bva_response_quality    TINYINT      NOT NULL CHECK (bva_response_quality BETWEEN 1 AND 10),
    bva_cost_efficiency     TINYINT      NOT NULL CHECK (bva_cost_efficiency BETWEEN 1 AND 10),
    bva_korean_naturalness  TINYINT      NOT NULL CHECK (bva_korean_naturalness BETWEEN 1 AND 10),
    bva_domain_expertise    TINYINT      NOT NULL CHECK (bva_domain_expertise BETWEEN 1 AND 10),
    bva_response_speed      TINYINT      NOT NULL CHECK (bva_response_speed BETWEEN 1 AND 10),
    bva_stability           TINYINT      NOT NULL CHECK (bva_stability BETWEEN 1 AND 10),
    bva_security_compliance TINYINT      NOT NULL CHECK (bva_security_compliance BETWEEN 1 AND 10),
    bva_anti_hallucination  TINYINT      NOT NULL CHECK (bva_anti_hallucination BETWEEN 1 AND 10),
    bva_weighted_score      DECIMAL(4,2) GENERATED ALWAYS AS (
        bva_response_quality    * 0.25
      + bva_cost_efficiency     * 0.20
      + bva_korean_naturalness  * 0.15
      + bva_domain_expertise    * 0.10
      + bva_response_speed      * 0.10
      + bva_stability           * 0.05
      + bva_security_compliance * 0.10
      + bva_anti_hallucination  * 0.05
    ) STORED,
    -- OSS 전용 (NULL for commercial)
    license_type            VARCHAR(30)  NULL,
    self_host_difficulty    ENUM('high','medium','low') NULL,
    self_host_gpu_spec      VARCHAR(30)  NULL,
    self_host_monthly_usd   INT          NULL,
    self_host_monthly_krw   INT          NULL,
    -- 메타
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_provider (provider),
    INDEX idx_category (category),
    INDEX idx_bva_score (bva_weighted_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 10. 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026.03.11 | 초기 스키마 정의 (18개 컬럼) |
| 2.0 | 2026.03.11 | 10개 컬럼 추가: Function Calling, JSON Mode, Streaming, Rate Limit(TPM/RPM), SLA, Max Output Tokens, Fine-tuning, Embedding 연계, Guardrails 내장, PII 마스킹. Provider별 시트 분리 구조 정의 |
| 3.0 | 2026.03.11 | 전체 컬럼명 snake_case 전환. DB 타입 구체화(VARCHAR 길이, DECIMAL 정밀도, ENUM 값 영문화). 컬럼 매핑 참조표 추가. DDL 참고 코드 추가. `bva_weighted_score` GENERATED 컬럼 정의. NULL 처리 규칙 DB 관점으로 재정의 |
