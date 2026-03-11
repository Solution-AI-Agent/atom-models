# ADR-001: LLM BVA 데이터 테이블 정규화 설계

**Status:** Accepted
**Date:** 2026-03-11
**Deciders:** CRM Solutions Architecture팀

## Context

CRM 가상상담사 LLM BVA 평가 데이터를 단일 엑셀로 통합하되, 각 시트가 그대로 DB 테이블로 전환될 수 있는 구조가 필요하다. 기존에는 Commercial/OSS를 별도 엑셀로 관리했으나, 공통 컬럼이 25개로 동일하고 차이 컬럼은 Commercial 3개(compliance), OSS 5개(self-hosting)뿐이다.

**핵심 제약:**
- 시트 = 테이블 1:1 매핑
- FK 기반 정규화 (model_name PK)
- ENUM 값 정형화 (DB INSERT 가능한 수준)
- NULL 처리 규칙 명확화

## Decision

3개 테이블(시트) + 1개 뷰(시트) + 1개 레퍼런스 구조로 정규화한다.

## Table Design

### Table 1: `llm_models` (메인 팩트 테이블)

32개 전체 모델의 공통 속성 + BVA 점수를 하나의 테이블에 통합한다.

| Column Group | Columns | Note |
|---|---|---|
| PK | `model_name` | UNIQUE, NOT NULL |
| 기본 | `provider`, `release_date`, `model_type`, `category`, `parameters` | `model_type`: COMMERCIAL / OSS |
| 용량 | `context_window_k`, `max_output_tokens` | |
| 비용 | `input_dollar_per_m`, `output_dollar_per_m`, `rate_limit_tpm`, `sla_percent` | NULL 허용 (비공개 모델) |
| 벤치마크 | `mmlu_score`, `kmmlu_score`, `hallucination_rate` | |
| 성능 | `ttft_sec`, `throughput_tps` | |
| 기능 | `korean_support`, `multimodal`, `function_calling`, `json_mode`, `streaming`, `fine_tuning`, `embedding_model` | ENUM 정형화 |
| 보안 | `guardrails_builtin`, `pii_masking` | 공통 보안 기능 |
| BVA | `bva_response_quality` ~ `bva_anti_hallucination` (8개) + `bva_weighted_score` (GENERATED) | |

### Table 2: `llm_compliance` (Commercial 확장)

Commercial 모델만 해당하는 컴플라이언스/인증 정보. `model_name` FK → `llm_models`.

| Column | Type | Note |
|---|---|---|
| `model_name` | FK → llm_models | PK |
| `soc2_certified` | ENUM | Y / N / INQUIRE |
| `hipaa_baa` | VARCHAR(30) | Y(Azure), Y(AWS) 등 provider 상세 포함 |
| `data_residency_kr` | VARCHAR(30) | Y(Azure Korea), NATIVE(KR) 등 |

### Table 3: `llm_self_hosting` (OSS 확장)

OSS 모델만 해당하는 셀프호스팅/라이선스 정보. `model_name` FK → `llm_models`.

| Column | Type | Note |
|---|---|---|
| `model_name` | FK → llm_models | PK |
| `license_type` | VARCHAR(30) | MIT, Apache 2.0, Llama 4 등 |
| `self_host_difficulty` | ENUM | HIGH / MED / LOW |
| `self_host_gpu_spec` | VARCHAR(30) | 8x A100 80GB 등 |
| `self_host_monthly_usd` | INT | 순수 숫자 |
| `self_host_monthly_krw` | INT | 순수 숫자 |

### View (시트 4): `v_tco_simulation`

메인 테이블에서 파생되는 TCO 시뮬레이션 뷰. 엑셀에서는 수식으로 구현.

```sql
CREATE VIEW v_tco_simulation AS
SELECT
    m.model_name, m.provider, m.model_type,
    m.input_dollar_per_m, m.output_dollar_per_m,
    (m.input_dollar_per_m * 50 + m.output_dollar_per_m * 30) AS monthly_api_cost_usd,
    (m.input_dollar_per_m * 50 + m.output_dollar_per_m * 30) * 1350 AS monthly_api_cost_krw,
    m.bva_weighted_score,
    CASE
        WHEN m.bva_weighted_score >= 7.5 AND (...) < 100 THEN 'S'
        WHEN m.bva_weighted_score >= 7.5 AND (...) < 500 THEN 'A'
        WHEN m.bva_weighted_score >= 7.0 THEN 'B'
        WHEN m.bva_weighted_score >= 6.5 THEN 'C'
        ELSE 'D'
    END AS cost_efficiency_grade
FROM llm_models m
WHERE m.input_dollar_per_m IS NOT NULL;
```

## Options Considered

### Option A: Single Table (비정규화)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Scalability | Low — 컬럼 40+ 비대 |
| NULL 비율 | High — Commercial에 5개, OSS에 3개 항상 NULL |
| DB 전환성 | Low — wide table anti-pattern |

**Pros:** 단일 시트로 관리 간편
**Cons:** NULL 컬럼 과다, model_type별 의미 없는 컬럼 존재, 확장 시 더 비대해짐

### Option B: 3-Table 정규화 (채택)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Med |
| Scalability | High — 확장 테이블 추가 용이 |
| NULL 비율 | Zero — 각 테이블에 의미 있는 컬럼만 |
| DB 전환성 | High — 시트 → CREATE TABLE 1:1 |

**Pros:** NULL 없음, 깔끔한 FK 관계, DDL 직접 전환 가능, 확장성 우수
**Cons:** JOIN 필요, 시트 간 참조 관계 관리

### Option C: 상속 패턴 (Table-per-type)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Scalability | High |
| DB 전환성 | Med — ORM 의존적 |

**Pros:** OOP 매핑에 유리
**Cons:** 이 규모(32 모델)에서는 과설계

## Trade-off Analysis

Option B가 최적인 이유: 현재 데이터 규모(32 모델)에서 3-table 구조는 복잡도가 과하지 않으면서, DB 전환 시 NULL 없는 깔끔한 스키마를 보장한다. Commercial 확장(새 인증 컬럼)이나 OSS 확장(새 호스팅 옵션)이 메인 테이블에 영향을 주지 않는다.

## ENUM 정형화 규칙

| 원본 값 | 정형화 | 비고 |
|---------|--------|------|
| O | Y | 지원함 |
| X | N | 미지원 |
| ◎ | NATIVE | 한국어 네이티브 수준 |
| 제한적 | PARTIAL | 부분 지원 |
| 별도 / 별도문의 | INQUIRE | 별도 문의 필요 |
| N/A | NULL 또는 N/A | 해당 없음 |

## Consequences

- 엑셀 시트명 = DB 테이블명으로 직접 매핑 가능
- `model_name` 기준 JOIN으로 전체 데이터 복원 가능
- 신규 모델 추가 시 llm_models + 해당 확장 테이블에만 INSERT
- TCO는 뷰로 관리하여 원본 데이터 변경 시 자동 반영

## Action Items

1. [x] ADR 문서 작성
2. [ ] 통합 엑셀 빌드 (llm_models + llm_compliance + llm_self_hosting + v_tco_simulation + Data_Dictionary)
3. [ ] 스키마 정의서 v4.0 업데이트
4. [ ] DDL 반영
