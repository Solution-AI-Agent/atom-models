# Architecture 팀 데이터 스키마 vs 현재 BVA 설계 비교 분석

> DBA 산출물 | 2026-03-11

---

## 1. 전체 필드 매핑표

### 1.1 기본 정보

| # | Architecture (`snake_case`) | 현재 시스템 (`camelCase`) | 매핑 상태 | 차이점 |
|---|---------------------------|------------------------|----------|--------|
| 1 | `model_name` VARCHAR(100) | `name` String | 일치 (이름만 다름) | - |
| 2 | `provider` VARCHAR(50) | `provider` String | 완전 일치 | - |
| 3 | `release_date` VARCHAR(7) "YYYY.MM" | `releaseDate` Date | 타입 차이 | Architecture: 문자열(월 단위), 현재: Date 객체 |
| 4 | `category` ENUM(global/korea/oss) | `type` ENUM(commercial/open-source) | 체계 충돌 | 섹션 6에서 상세 분석 |
| 5 | `parameters` VARCHAR(50) | `parameterSize` Number + `activeParameters` Number | 현재가 더 구조화 | Architecture: "400B MoE" 문자열, 현재: 숫자 + MoE 별도 |
| - | - | `slug` String | 현재에만 존재 | URL 라우팅용 |
| - | - | `tier` ENUM(flagship/mid/small/mini/micro) | 현재에만 존재 | 모델 등급 분류 |
| - | - | `architecture` ENUM(dense/moe) | 현재에만 존재 | 아키텍처 유형 |

### 1.2 성능 지표

| # | Architecture | 현재 시스템 | 매핑 상태 | 차이점 |
|---|-------------|-----------|----------|--------|
| 6 | `context_window_k` INT (K 단위) | `contextWindow` Number (K 단위) | 일치 | - |
| 7 | `mmlu_score` DECIMAL(5,2) | `benchmarks.mmlu` Number | 일치 (저장 구조 다름) | Architecture: 컬럼, 현재: Map |
| 8 | `kmmlu_score` DECIMAL(5,2) | `benchmarks.kmmlu` Number | 일치 (저장 구조 다름) | 동일 |
| 9 | `hallucination_rate` VARCHAR(10) | 없음 | 신규 후보 | "low/medium/high" 또는 숫자 |
| 10 | `ttft_sec` DECIMAL(4,2) | 없음 | 신규 후보 | Time To First Token (초) |
| 11 | `throughput_tps` INT | `infrastructure.estimatedTps` Number | 부분 일치 | Architecture: 모든 모델, 현재: OSS만 |
| 12 | `max_output_tokens` INT | `maxOutput` Number | 일치 (이름만 다름) | - |
| - | - | `benchmarks.gpqa` | 현재에만 존재 | Architecture는 벤치마크를 BVA 점수로 흡수 |
| - | - | `benchmarks.swe_bench` | 현재에만 존재 | 동일 |
| - | - | `benchmarks.aime` | 현재에만 존재 | 동일 |
| - | - | `benchmarks.hle` | 현재에만 존재 | 동일 |
| - | - | `benchmarks.mgsm` | 현재에만 존재 | 동일 |

### 1.3 비용 정보

| # | Architecture | 현재 시스템 | 매핑 상태 | 차이점 |
|---|-------------|-----------|----------|--------|
| 13 | `input_dollar_per_m` DECIMAL(8,3) | `pricing.input` Number | 일치 | 단위 동일 ($/1M tokens) |
| 14 | `output_dollar_per_m` DECIMAL(8,3) | `pricing.output` Number | 일치 | 동일 |
| 15 | `rate_limit_tpm` VARCHAR(30) | 없음 | 신규 후보 | 분당 토큰 한도 |
| 16 | `rate_limit_rpm` VARCHAR(30) | 없음 | 신규 후보 | 분당 요청 한도 |
| - | - | `pricing.cachingDiscount` Number | 현재에만 존재 | 캐싱 할인율 |
| - | - | `pricing.batchDiscount` Number | 현재에만 존재 | 배치 할인율 |

### 1.4 기능 지원

| # | Architecture | 현재 시스템 | 매핑 상태 | 차이점 |
|---|-------------|-----------|----------|--------|
| 17 | `function_calling` ENUM | 없음 | 신규 후보 | supported/unsupported/limited |
| 18 | `json_mode` ENUM | 없음 | 신규 후보 | Structured Output 지원 |
| 19 | `streaming` ENUM | 없음 | 신규 후보 | 스트리밍 응답 |
| 20 | `fine_tuning` VARCHAR(50) | 없음 | 신규 후보 | 파인튜닝 지원 방식 |
| 21 | `multimodal` ENUM | 없음 | 신규 후보 | 이전 scores.multimodal에서 제거됨 |
| 22 | `embedding_model` VARCHAR(50) | 없음 | 신규 후보 | 연계 임베딩 모델 |

### 1.5 한국어 역량

| # | Architecture | 현재 시스템 | 매핑 상태 | 차이점 |
|---|-------------|-----------|----------|--------|
| 23 | `korean_support` ENUM(4등급) | `languageScores.ko` Number | 구조 차이 | Architecture: 등급, 현재: 수치 |

### 1.6 보안/컴플라이언스

| # | Architecture | 현재 시스템 | 매핑 상태 | 차이점 |
|---|-------------|-----------|----------|--------|
| 24 | `soc2_certified` ENUM(3값) | `compliance.soc2` Boolean | 정밀도 차이 | Architecture: certified/not_certified/separate, 현재: true/false |
| 25 | `hipaa_baa` ENUM(3값) | `compliance.hipaa` Boolean | 정밀도 차이 | 동일 패턴 |
| 26 | `data_residency_kr` VARCHAR(50) | 없음 | 신규 후보 | 한국 리전 데이터 저장 |
| 27 | `sla_percent` DECIMAL(5,2) | 없음 | 신규 후보 | 서비스 가용성 보장 |
| 28 | `guardrails_builtin` ENUM | 없음 | 신규 후보 | 안전장치 내장 |
| 29 | `pii_masking` ENUM | 없음 | 신규 후보 | 개인정보 마스킹 |
| - | - | `compliance.gdpr` Boolean | 현재에만 존재 | GDPR 준수 |
| - | - | `compliance.onPremise` Boolean | 현재에만 존재 | 온프레미스 배포 가능 |
| - | - | `compliance.dataExclusion` Boolean | 현재에만 존재 | 학습 데이터 제외 |

### 1.7 BVA 평가 점수

| # | Architecture | 현재 시스템 | 매핑 상태 | 차이점 |
|---|-------------|-----------|----------|--------|
| 30-37 | `bva_*` 8개 (TINYINT, 1-10) | BVA 차원 4개 (벤치마크 기반 계산) | 체계 충돌 | 섹션 2에서 상세 분석 |
| 38 | `bva_weighted_score` (고정 가중치) | `calculateFitnessScore()` (프리셋별 가변) | 체계 충돌 | 동일 |

### 1.8 OSS 전용

| # | Architecture | 현재 시스템 | 매핑 상태 | 차이점 |
|---|-------------|-----------|----------|--------|
| O1 | `license_type` VARCHAR(30) | `license` String | 일치 | - |
| O2 | `self_host_difficulty` ENUM | 없음 | 신규 후보 | high/medium/low |
| O3 | `self_host_gpu_spec` VARCHAR(30) | `infrastructure.minGpu` String | 일치 (이름만 다름) | - |
| O4 | `self_host_monthly_usd` INT | 없음 | 신규 후보 | 월 셀프호스팅 비용(USD) |
| O5 | `self_host_monthly_krw` INT | 없음 | 신규 후보 | 월 셀프호스팅 비용(KRW) |

### 1.9 현재에만 있는 필드 (Architecture에 없음)

| 필드 | 용도 | 유지 여부 |
|------|------|----------|
| `slug` | URL 라우팅 | 유지 (웹앱 필수) |
| `tier` | 모델 등급 분류 | 유지 (필터/정렬 핵심) |
| `activeParameters` | MoE 활성 파라미터 | 유지 (MoE 모델 구별) |
| `architecture` | dense/moe | 유지 (인프라 가이드) |
| `pricing.cachingDiscount` | 캐싱 할인율 | 유지 (비용 시뮬레이션) |
| `pricing.batchDiscount` | 배치 할인율 | 유지 (비용 시뮬레이션) |
| `compliance.gdpr` | GDPR 준수 | 유지 (Architecture보다 넓은 범위) |
| `compliance.onPremise` | 온프레미스 배포 | 유지 (보안 요건 필터) |
| `compliance.dataExclusion` | 학습 제외 옵션 | 유지 (보안 요건 필터) |
| `languageScores` | 다국어 점수 맵 | 유지 (표시용) |
| `benchmarks` (7개) | 벤치마크 원시 데이터 | 유지 (BVA 계산의 원천) |
| `infrastructure.*` (VRAM 상세) | 양자화별 VRAM | 유지 (인프라 가이드 핵심) |
| `memo` | 비고 | 유지 |
| `sourceUrls` | 출처 URL | 유지 (데이터 투명성) |
| `colorCode` | UI 색상 | 유지 |
| `lastVerifiedAt` | 마지막 검증일 | 유지 |
| `isRecentlyReleased` (virtual) | 최근 출시 여부 | 유지 |

---

## 2. BVA 점수 체계 비교 및 통합 방안

### 2.1 근본적 차이

| 관점 | Architecture 팀 | 현재 설계 |
|------|----------------|----------|
| 점수 원천 | 평가자가 매긴 주관적 1-10점 | 공인 벤치마크 결과 기반 계산 |
| 차원 수 | 8개 (고정) | 4개 + cost (확장 가능) |
| 가중치 | 전역 고정 (25/20/15/10/10/5/10/5) | 프리셋(업종/업무)별 가변 |
| 설명 가능성 | "전문가가 8점을 매겼습니다" | "GPQA 65.0, AIME 83.3 벤치마크 결과" |
| 총점 범위 | 0.00 ~ 10.00 | 0 ~ 100 |

### 2.2 차원 매핑

| Architecture 차원 | 가중치 | 현재 설계 대응 | 통합 방안 |
|------------------|--------|--------------|----------|
| `bva_response_quality` (응답 품질) | 25% | `knowledge` + `reasoning` | 벤치마크 기반 knowledge/reasoning으로 대체 |
| `bva_cost_efficiency` (비용 효율성) | 20% | `cost` | 기존 cost 로직 유지 (pricing 기반) |
| `bva_korean_naturalness` (한국어 자연스러움) | 15% | `korean` | KMMLU + MGSM 기반 유지 |
| `bva_domain_expertise` (도메인 전문성) | 10% | 프리셋 가중치로 간접 반영 | 프리셋별 가중치 조절로 대응 |
| `bva_response_speed` (응답 속도) | 10% | 없음 (벤치마크 부재) | 신규 운영 지표 `ttft`/`throughput` 필드 추가 |
| `bva_stability` (안정성) | 5% | 없음 | 신규 운영 지표 `sla` 필드 추가 |
| `bva_security_compliance` (보안/컴플라이언스) | 10% | `compliance` (boolean 태그) | 현재의 태그 방식 유지 (점수화 부적합) |
| `bva_anti_hallucination` (환각 방지) | 5% | 없음 (벤치마크 부재) | Phase 2 검토 (환각 벤치마크 확보 시) |

### 2.3 통합 방안: 하이브리드 접근

**원칙: 현재의 벤치마크 기반 설계를 유지하되, Architecture 팀의 운영 지표를 "보조 데이터"로 수용**

```
[최종 BVA 체계]

1단계: 벤치마크 기반 차원 점수 (현재 유지)
  - reasoning: GPQA(40%) + AIME(30%) + HLE(30%)
  - korean:    KMMLU(70%) + MGSM(30%)
  - coding:    SWE-bench(100%)
  - knowledge: MMLU(70%) + GPQA(30%)
  - cost:      pricing 기반 공식

2단계: 운영 지표 (신규 필드, 점수 계산에 미포함)
  - 응답 속도: ttft + throughput (UI에 표시만)
  - 안정성:   sla (UI에 표시만)
  - 보안:     compliance 태그 (필터 조건)

3단계: 프리셋 가중치 (현재 유지)
  - 업종/업무별 가변 가중치 적용
  - 총점 = sum(차원점수 * 프리셋가중치)
```

**Architecture 팀의 BVA 1-10 점수는 채택하지 않음.** 이유:
1. 평가자 주관 개입으로 고객 설명력 부족
2. 벤치마크 기반 체계가 더 투명하고 재현 가능
3. 벤치마크 업데이트 시 자동 반영 가능 (1-10은 수동 재평가 필요)

**단, 운영 지표(ttft, throughput, sla)는 벤치마크가 없는 영역이므로 별도 필드로 수용.** UI에서 참고 정보로 표시하되, BVA 총점 계산에는 포함하지 않는다. Phase 2에서 충분한 데이터 축적 후 차원 추가 여부를 재검토한다.

---

## 3. 신규 필드 채택/보류/제외 목록

### 3.1 채택 (Adopt)

| 필드 | Mongoose 필드명 | 타입 | 위치 | 이유 | BVA 영향 |
|------|-----------------|------|------|------|---------|
| `ttft_sec` | `ttft` | Number (nullable) | Model 루트 | 응답 속도 정량 지표, 벤치마크 대체 불가 | 점수 계산 미포함, UI 참고 표시 |
| `throughput_tps` | `throughput` | Number (nullable) | Model 루트 | 토큰 생성 속도, 상용 모델도 측정 가능 | 동일 |
| `function_calling` | `capabilities.functionCalling` | String enum | `capabilities` 서브문서 | CRM 가상상담사 핵심 기능, 프리셋 필터로 활용 | 점수 미포함, 필터/표시 |
| `json_mode` | `capabilities.jsonMode` | String enum | `capabilities` 서브문서 | API 통합 핵심 기능 | 동일 |
| `streaming` | `capabilities.streaming` | String enum | `capabilities` 서브문서 | 실시간 응답 지원 여부 | 동일 |
| `multimodal` | `capabilities.multimodal` | String enum | `capabilities` 서브문서 | 이미지/오디오 입력 지원 (이전 scores에서 이관) | 동일 |
| `fine_tuning` | `capabilities.fineTuning` | String | `capabilities` 서브문서 | 커스터마이징 가능 여부 | 동일 |
| `korean_support` | `koreanSupport` | String enum | Model 루트 | languageScores.ko와 별개로 등급 분류 유용 | 동일 |
| `data_residency_kr` | `compliance.dataResidencyKr` | String | `compliance` 확장 | 한국 기업 필수 요건 | 점수 미포함, 필터 |
| `sla_percent` | `sla` | Number (nullable) | Model 루트 | 서비스 안정성 정량 지표 | 점수 미포함, UI 참고 |
| `guardrails_builtin` | `compliance.guardrails` | String enum | `compliance` 확장 | 엔터프라이즈 안전장치 | 점수 미포함, 필터 |
| `pii_masking` | `compliance.piiMasking` | String enum | `compliance` 확장 | 개인정보 처리 요건 | 동일 |
| `self_host_difficulty` | `selfHostDifficulty` | String enum | Model 루트 | OSS 모델 배포 난이도 | 점수 미포함, UI 표시 |
| `self_host_monthly_usd` | `selfHostCost.monthlyUsd` | Number (nullable) | `selfHostCost` 서브문서 | TCO 비교 핵심 데이터 | 비용 시뮬레이션에 활용 |
| `self_host_monthly_krw` | `selfHostCost.monthlyKrw` | Number (nullable) | `selfHostCost` 서브문서 | 한국 시장 원화 환산 | 동일 |
| `rate_limit_tpm` | `rateLimit.tpm` | String (nullable) | `rateLimit` 서브문서 | 용량 계획 핵심 데이터 | 점수 미포함, UI 표시 |
| `rate_limit_rpm` | `rateLimit.rpm` | String (nullable) | `rateLimit` 서브문서 | 동일 | 동일 |

### 3.2 보류 (Hold)

| 필드 | 이유 | 재검토 시점 |
|------|------|-----------|
| `hallucination_rate` | "low/medium/high" 또는 % 혼재 — 측정 기준이 표준화되지 않음. 현재 설계의 "벤치마크 기반 투명성" 원칙에 위배. | Phase 2에서 표준화된 환각 벤치마크(TruthfulQA, HaluEval) 데이터 확보 시 |
| `embedding_model` | 현재 플랫폼의 주요 기능(LLM 비교/추천)과 직접 관련 없음. 임베딩 모델 비교는 별도 도구가 적합. | 임베딩 비교 기능 추가 시 |

### 3.3 제외 (Reject)

| 필드 | 이유 |
|------|------|
| `bva_response_quality` ~ `bva_anti_hallucination` (8개) | 주관적 1-10 점수 체계. 현재 벤치마크 기반 설계의 핵심 원칙("모든 점수는 출처가 명시")에 위배 |
| `bva_weighted_score` (계산 컬럼) | 위 8개 점수의 산출값이므로 동일한 이유로 제외. 현재의 `calculateFitnessScore()` 함수가 프리셋별 가변 가중치로 더 유연하게 대응 |

---

## 4. TCO 모델 통합 방안

### 4.1 Architecture 팀 TCO 모델 분석

```
기준 시나리오:
- 월 상담 100,000건
- 건당 입력 500 토큰, 출력 300 토큰
- 월 입력 50M, 출력 30M 토큰
- 환율 1,350원/USD

API TCO = (input_price * 50) + (output_price * 30)
```

### 4.2 현재 시스템의 비용 모델

```
BVA 입력 기반 (볼륨 구간 선택):
- under-10k:  5M input / 2.5M output
- 10k-100k:   50M / 25M
- 100k-1m:    500M / 250M
- over-1m:    5B / 2.5B

costScore = max(0, 100 - (output_price/60) * 100)  // 상용
costScore = 100  // OSS
```

### 4.3 통합 방안

Architecture 팀의 TCO 모델은 현재의 볼륨 기반 비용 추정과 **상호 보완적**:

| 항목 | Architecture | 현재 | 통합 |
|------|-------------|------|------|
| 시나리오 | 고정 (10만건) | 사용자 선택 (4구간) | 현재 유지 + 사용자 입력 확장 |
| API 비용 | `input*50 + output*30` | 볼륨 구간별 고정값 | 현재 유지 (이미 더 유연) |
| OSS 비용 | `self_host_monthly_usd` 고정값 | 계산 없음 | **신규 필드 채택** (3.1 참조) |
| 환율 | 1,350원 고정 | 없음 | 환율 상수 추가 (Phase 2) |
| 운영비 | ops/storage/network 별도 산정 | 없음 | Phase 2에서 상세 TCO 계산기 구현 시 반영 |

**즉시 적용 사항:**
1. `selfHostCost.monthlyUsd` / `selfHostCost.monthlyKrw` 필드 추가 (섹션 3.1에서 채택)
2. OSS 모델의 TCO를 API 비용과 셀프호스팅 비용 양쪽으로 비교 표시
3. BVA 리포트의 "비용 시뮬레이션" 섹션에서 두 옵션 병렬 제시

**Phase 2 확장:**
- 사용자 직접 입력: 월 상담건수, 건당 토큰, 환율
- 운영비 포함 상세 TCO: GPU + 인력(0.5명) + 스토리지 + 네트워크
- 손익분기점 계산: API vs 셀프호스팅 교차점

---

## 5. 네이밍 컨벤션

### 5.1 현황

| 체계 | Architecture 팀 | 현재 시스템 |
|------|----------------|-----------|
| 필드명 | `snake_case` | `camelCase` |
| DB | MySQL DDL 기준 | MongoDB/Mongoose |
| 타입 | SQL ENUM, DECIMAL, TINYINT | TypeScript, Mongoose Schema |

### 5.2 통합 전략

**MongoDB/Mongoose의 `camelCase` 유지.** 이유:
1. 현재 시스템이 MongoDB 기반으로 확정됨 (Phase 1 완료)
2. JavaScript/TypeScript 표준 컨벤션이 `camelCase`
3. Mongoose 스키마에서 `camelCase`가 관례
4. 이미 87개 모델 + 12개 프리셋이 `camelCase`로 시드됨

**Architecture 팀 필드 → 현재 시스템 네이밍 규칙:**

```
snake_case             → camelCase
-----------------------------------------
ttft_sec               → ttft
throughput_tps          → throughput
function_calling       → capabilities.functionCalling
json_mode              → capabilities.jsonMode
rate_limit_tpm         → rateLimit.tpm
rate_limit_rpm         → rateLimit.rpm
data_residency_kr      → compliance.dataResidencyKr
sla_percent            → sla
guardrails_builtin     → compliance.guardrails
pii_masking            → compliance.piiMasking
korean_support         → koreanSupport
self_host_difficulty   → selfHostDifficulty
self_host_monthly_usd  → selfHostCost.monthlyUsd
self_host_monthly_krw  → selfHostCost.monthlyKrw
```

### 5.3 ENUM 값 전략

Architecture 팀의 ENUM 값(`supported`/`unsupported`/`limited`)은 의미가 명확하므로 그대로 채택. 단, TypeScript union type으로 표현:

```typescript
type SupportLevel = 'supported' | 'unsupported' | 'limited'
type KoreanSupportLevel = 'excellent' | 'supported' | 'limited' | 'unsupported'
type SelfHostDifficulty = 'high' | 'medium' | 'low'
```

---

## 6. 카테고리 체계 통합

### 6.1 현황 비교

| Architecture | 의미 | 현재 | 의미 |
|-------------|------|------|------|
| `global` | 글로벌 상용 모델 | `commercial` | 상용 모델 전체 |
| `korea` | 한국 특화 모델 | `commercial` (provider로 구분) | 한국 모델도 commercial |
| `oss` | 오픈소스 | `open-source` | 동일 |

### 6.2 통합 방안: 현재 체계 유지 + 태그 확장

**`type: commercial | open-source` 체계를 유지한다.** 이유:
1. 이미 모든 추천/필터 로직이 이 이분법에 의존
2. "한국 모델"은 `provider` 필드로 자연스럽게 필터 가능 (NAVER, Upstage, LG 등)
3. Architecture의 `korea` 분류는 `koreanSupport: 'excellent'` + 한국 provider로 대체 가능

추가로 `koreanSupport` 필드(3.1에서 채택)가 한국어 특화 여부를 명시적으로 표현하므로, 별도 `category` 필드는 불필요하다.

---

## 7. 최종 통합 Model 스키마 제안

### 7.1 TypeScript 인터페이스

```typescript
// src/lib/types/model.ts -- 통합 후

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
  // Architecture 팀 신규 필드
  readonly dataResidencyKr: string | null      // 'aws_seoul' | 'gcp_seoul' | 'kr_only' | 'none' 등
  readonly guardrails: SupportLevel | null
  readonly piiMasking: SupportLevel | null
}

export type SupportLevel = 'supported' | 'unsupported' | 'limited'
export type KoreanSupportLevel = 'excellent' | 'supported' | 'limited' | 'unsupported'
export type SelfHostDifficulty = 'high' | 'medium' | 'low'

export interface IModelCapabilities {
  readonly functionCalling: SupportLevel
  readonly jsonMode: SupportLevel
  readonly streaming: SupportLevel
  readonly multimodal: SupportLevel
  readonly fineTuning: string                  // 'full' | 'lora' | 'prompt_tuning' | 'none' | 복수
}

export interface IModelRateLimit {
  readonly tpm: string | null                  // 'Tier3:2M' 등
  readonly rpm: string | null
}

export interface IModelSelfHostCost {
  readonly monthlyUsd: number | null
  readonly monthlyKrw: number | null
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
  | 'mmlu' | 'gpqa' | 'swe_bench' | 'aime' | 'hle' | 'mgsm'
  | 'kmmlu'

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

  // 비용
  readonly pricing: IModelPricing

  // 보안/컴플라이언스 (확장)
  readonly compliance: IModelCompliance

  // 기능 지원 (신규)
  readonly capabilities: IModelCapabilities

  // 운영 지표 (신규)
  readonly ttft: number | null                 // Time To First Token (초)
  readonly throughput: number | null            // 토큰 생성 속도 (tok/s, 상용+OSS)
  readonly sla: number | null                  // SLA % (예: 99.95)
  readonly rateLimit: IModelRateLimit | null

  // 한국어 (신규)
  readonly koreanSupport: KoreanSupportLevel | null

  // 기존 유지
  readonly languageScores: Record<string, number>
  readonly benchmarks: Partial<Record<BenchmarkKey, number | null>>
  readonly infrastructure: IModelInfrastructure | null

  // OSS 전용 (신규)
  readonly selfHostDifficulty: SelfHostDifficulty | null
  readonly selfHostCost: IModelSelfHostCost | null

  // 메타
  readonly releaseDate: string
  readonly memo: string
  readonly sourceUrls: readonly string[]
  readonly colorCode: string
  readonly lastVerifiedAt: string
  readonly isRecentlyReleased?: boolean
}
```

### 7.2 Mongoose 스키마 변경 diff

기존 `src/lib/db/models/model.ts`에 대해 다음을 추가:

```typescript
// --- 신규 서브문서/필드 (ModelSchema에 추가) ---

// compliance 확장
compliance: {
  soc2:            { type: Boolean, default: false },
  hipaa:           { type: Boolean, default: false },
  gdpr:            { type: Boolean, default: false },
  onPremise:       { type: Boolean, default: false },
  dataExclusion:   { type: Boolean, default: false },
  // 신규
  dataResidencyKr: { type: String, default: null },
  guardrails:      { type: String, enum: ['supported', 'unsupported', 'limited'], default: null },
  piiMasking:      { type: String, enum: ['supported', 'unsupported', 'limited'], default: null },
},

// 기능 지원 (신규 서브문서)
capabilities: {
  functionCalling: { type: String, enum: ['supported', 'unsupported', 'limited'], default: 'unsupported' },
  jsonMode:        { type: String, enum: ['supported', 'unsupported', 'limited'], default: 'unsupported' },
  streaming:       { type: String, enum: ['supported', 'unsupported'], default: 'unsupported' },
  multimodal:      { type: String, enum: ['supported', 'unsupported'], default: 'unsupported' },
  fineTuning:      { type: String, default: 'none' },
},

// 운영 지표 (신규)
ttft:       { type: Number, default: null },
throughput: { type: Number, default: null },
sla:        { type: Number, default: null },
rateLimit: {
  tpm: { type: String, default: null },
  rpm: { type: String, default: null },
},

// 한국어 등급 (신규)
koreanSupport: {
  type: String,
  enum: ['excellent', 'supported', 'limited', 'unsupported'],
  default: null,
},

// OSS 전용 (신규)
selfHostDifficulty: {
  type: String,
  enum: ['high', 'medium', 'low'],
  default: null,
},
selfHostCost: {
  monthlyUsd: { type: Number, default: null },
  monthlyKrw: { type: Number, default: null },
},
```

### 7.3 IModelDocument 변경

```typescript
export interface IModelDocument extends Document {
  // ... 기존 필드 모두 유지 ...

  // 신규 필드
  compliance: {
    soc2: boolean
    hipaa: boolean
    gdpr: boolean
    onPremise: boolean
    dataExclusion: boolean
    dataResidencyKr: string | null
    guardrails: string | null
    piiMasking: string | null
  }
  capabilities: {
    functionCalling: string
    jsonMode: string
    streaming: string
    multimodal: string
    fineTuning: string
  }
  ttft: number | null
  throughput: number | null
  sla: number | null
  rateLimit: {
    tpm: string | null
    rpm: string | null
  } | null
  koreanSupport: string | null
  selfHostDifficulty: string | null
  selfHostCost: {
    monthlyUsd: number | null
    monthlyKrw: number | null
  } | null
}
```

---

## 8. 마이그레이션 영향도

### 8.1 스키마 변경 (파일 수정)

| 파일 | 변경 내용 | 위험도 |
|------|----------|--------|
| `src/lib/types/model.ts` | 신규 인터페이스/타입 추가, IModel 확장 | 중 |
| `src/lib/db/models/model.ts` | Mongoose 스키마에 신규 필드 추가 | 중 |

### 8.2 시드 데이터 (파일 수정)

| 파일 | 변경 내용 | 위험도 |
|------|----------|--------|
| `data/models.json` | 87개 모델에 신규 필드 추가 (초기값 null/default) | 고 (대량 수정) |
| `scripts/seed.ts` | 신규 필드 upsert 반영 | 저 |

### 8.3 기존 로직 영향 없음

| 영역 | 이유 |
|------|------|
| BVA 차원 계산 (`score.ts`) | 신규 필드는 BVA 점수 계산에 미포함 (표시용) |
| 추천 서비스 (`recommendation.service.ts`) | 기존 4차원 + cost 로직 변경 없음 |
| 프리셋 가중치 (`IPresetWeights`) | 변경 없음 |
| UI 컴포넌트 | 신규 필드 표시는 별도 태스크로 분리 |

### 8.4 점진적 마이그레이션 전략

모든 신규 필드는 **nullable(default: null)** 또는 **default 값**을 가지므로, 기존 데이터와 완전 하위 호환된다.

```
Phase A (즉시): 스키마 + 타입 확장
  - model.ts 타입 추가
  - Mongoose 스키마에 nullable 필드 추가
  - 기존 87개 모델: 신규 필드 모두 null/default
  - 기존 로직 영향: 제로

Phase B (데이터 수집): 시드 데이터 보강
  - 상용 모델: capabilities, ttft, throughput, sla, rateLimit 조사
  - 한국 모델: koreanSupport, dataResidencyKr 조사
  - OSS 모델: selfHostDifficulty, selfHostCost 조사
  - models.json 업데이트

Phase C (UI 확장): 신규 필드 표시
  - 모델 상세 페이지에 capabilities 섹션 추가
  - 비교표에 운영 지표 컬럼 추가
  - BVA 리포트에 TCO 비교 추가
```

### 8.5 데이터 수집 우선순위

| 우선순위 | 필드 | 이유 |
|---------|------|------|
| P0 | `capabilities.*` (5개) | CRM 가상상담사 핵심 — function calling, JSON mode 없으면 통합 불가 |
| P0 | `koreanSupport` | 한국 시장 핵심 — 프리셋 필터링에 즉시 활용 |
| P1 | `ttft`, `throughput` | 응답 속도 — Architecture 팀 요구사항 핵심 |
| P1 | `selfHostCost.*` | TCO 비교 — BVA 리포트 완성도 향상 |
| P2 | `sla`, `rateLimit.*` | 운영 안정성 — 엔터프라이즈 고객 의사결정 보조 |
| P2 | `compliance` 확장 (3개) | 보안 — 규제 산업 고객 필터링 |
| P3 | `selfHostDifficulty` | 참고 정보 — 있으면 좋지만 필수 아님 |

---

## 요약

| 항목 | 결론 |
|------|------|
| BVA 점수 체계 | **현재의 벤치마크 기반 4차원 + cost 유지**. Architecture의 1-10 주관 점수 불채택 |
| 운영 지표 | `ttft`, `throughput`, `sla` **신규 필드로 채택** (UI 표시, 점수 계산 미포함) |
| 기능 지원 | `capabilities` **서브문서 신규 추가** (5개 필드) |
| 보안 확장 | `compliance` **3개 필드 확장** (dataResidencyKr, guardrails, piiMasking) |
| 비용 | `selfHostCost`, `rateLimit` **신규 추가** (TCO 비교 강화) |
| 카테고리 | **현재 commercial/open-source 유지**. korea는 koreanSupport + provider로 대체 |
| 네이밍 | **camelCase 유지** (MongoDB/JS 표준) |
| 환각 지표 | **보류** (표준 벤치마크 확보 시 Phase 2 재검토) |
| 하위 호환성 | 모든 신규 필드 nullable — **기존 코드 영향 제로** |
