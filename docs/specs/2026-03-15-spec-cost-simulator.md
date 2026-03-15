# 비용 시뮬레이터 설계 문서

**작성일:** 2026-03-15
**상태:** Approved
**PRD 참조:** F4.1 API 비용 계산, F4.2 셀프호스팅 손익분기점, F4.3 라우팅 비용 시뮬레이션

---

## 1. 목표

선택한 모델(최대 4개)의 API 비용, 셀프호스팅 손익분기점, 라우팅 절감 효과를 하나의 페이지에서 시뮬레이션한다. 계산은 전부 클라이언트 사이드에서 실시간 수행하며, 성능 평가는 BVA 리포트 링크로 연결한다.

---

## 2. 페이지 구조

**경로:** `/simulator`
**레이아웃:** 상단 공통 입력 + 하단 3탭

```
┌─────────────────────────────────────────────┐
│  모델 선택기 (최대 4개)                       │
│  기본 입력: 일 요청수, Input/Output 토큰, 운영일 │
├─────────────────────────────────────────────┤
│  [API 비용]  [손익분기점]  [라우팅]            │
├─────────────────────────────────────────────┤
│  탭별 시뮬레이션 영역                         │
└─────────────────────────────────────────────┘
```

---

## 3. 공통 입력

| 필드 | 타입 | 기본값 | 범위 | 설명 |
|------|------|--------|------|------|
| 모델 선택 | 멀티셀렉트 | - | 1~4개 | DB에서 검색 |
| 일 평균 요청 건수 | number | 1,000 | 1~1,000,000 | |
| 평균 Input 토큰 | number | 500 | 1~200,000 | 요청당 |
| 평균 Output 토큰 | number | 300 | 1~200,000 | 요청당 |
| 월 운영 일수 | number | 30 | 1~31 | |

**Zero-selection 상태:** 모델 미선택 시 전체 탭 영역에 "모델을 선택하면 비용 시뮬레이션을 시작할 수 있습니다" 안내 표시. 모든 탭 비활성.

---

## 4. 탭 1: API 비용

### 4.1 추가 입력

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 프롬프트 캐싱 적용률 | slider | 0% | 0~100% |
| Batch API 활용 비율 | slider | 0% | 0~100% |

### 4.2 할인율 적용

프로바이더별 캐싱/배치 할인율을 시드 데이터에서 로드한다.

| 프로바이더 | 캐싱 할인 | 배치 할인 | 출처 |
|-----------|----------|----------|------|
| OpenAI | 50% | 50% | 공식 문서 |
| Anthropic | 90% | 50% | 공식 문서 |
| Google | 75% | 50% | 공식 문서 |
| 기타 | 50% | 50% | 업계 평균 폴백 |

캐싱 할인은 input 토큰에만 적용된다.

### 4.3 비용 계산 공식

```
monthlyTokens_input  = dailyRequests * avgInputTokens * monthlyDays
monthlyTokens_output = dailyRequests * avgOutputTokens * monthlyDays

// 4가지 input 세그먼트
realtime_input  = monthlyTokens_input * (1 - batchRate) * (1 - cacheRate)
cached_input    = monthlyTokens_input * (1 - batchRate) * cacheRate
batch_input     = monthlyTokens_input * batchRate * (1 - cacheRate)
batch_cached_in = monthlyTokens_input * batchRate * cacheRate

// 2가지 output 세그먼트
realtime_output = monthlyTokens_output * (1 - batchRate)
batch_output    = monthlyTokens_output * batchRate

// 단가 결정 (cachedInputPer1m 등이 null이면 폴백 계산)
inputPrice        = pricing.inputPer1m
cachedInputPrice  = pricing.cachedInputPer1m  ?? inputPrice * (1 - providerCacheDiscount)
batchInputPrice   = pricing.batchInputPer1m   ?? inputPrice * (1 - providerBatchDiscount)
batchOutputPrice  = pricing.batchOutputPer1m  ?? outputPrice * (1 - providerBatchDiscount)

// 배치+캐시 동시 적용: 배치 단가에 캐시 할인을 추가 적용 (multiplicative stacking)
// 근거: OpenAI/Anthropic 모두 배치+캐시 동시 적용 시 양쪽 할인이 중첩됨
batchCachedPrice  = batchInputPrice * (cachedInputPrice / inputPrice)

cost = (realtime_input  * inputPrice
      + cached_input    * cachedInputPrice
      + batch_input     * batchInputPrice
      + batch_cached_in * batchCachedPrice
      + realtime_output * outputPrice
      + batch_output    * batchOutputPrice) / 1_000_000
```

**폴백 할인율:** `providerCacheDiscount`와 `providerBatchDiscount`는 프로바이더별 시드 데이터에서 로드한다. 시드에 없으면 업계 평균 50%를 사용한다. 이 폴백 로직은 `cost-calculator.ts`의 `resolvePrice()` 함수에 집중한다.

OSS 모델(`model.type === 'open-source'`)은 API 비용 = $0로 표시하고, "셀프호스팅 비용은 손익분기점 탭에서 확인" 안내.

### 4.4 출력

- 모델별 월간/연간 비용 바 차트 (Recharts BarChart)
- 비용 상세 테이블 (input/output/캐싱/배치 breakdown)
- 최저 비용 모델 하이라이트
- 파라미터 변경 시 실시간 갱신 (디바운스 300ms)
- "BVA 성능 분석 보기" 링크 — 모델 1개 선택 시 해당 모델 상세(`/explore/[slug]`)로, 2개 이상 선택 시 BVA 입력 페이지(`/bva`)로 연결

---

## 5. 탭 2: 손익분기점

### 5.1 활성화 조건

선택한 모델 중 OSS 모델(`model.type === 'open-source'`)이 1개 이상 있을 때 활성화. 없으면 "OSS 모델을 선택하면 셀프호스팅 비용을 비교할 수 있습니다" 안내.

### 5.2 추가 입력

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| GPU 모델 | select | - | gpus 컬렉션에서 선택 |
| GPU 시간당 임대 단가 ($) | number | 시드 참고 시세 | 사용자 수정 가능 |
| 필요 GPU 수 | number | 자동 계산 | 모델 VRAM 기반, 수동 오버라이드 가능 |
| 일 가동시간 | number | 24 | 시간 |
| 월 부대비용 ($) | number | 0 | 전기, 관리 등 |

### 5.3 비용 계산 공식

```
monthlyGpuCost = hourlyRate * gpuCount * dailyHours * monthlyDays
monthlySelfHosted = monthlyGpuCost + monthlyOverhead

// API 비교 대상: 사용자가 선택한 모델 중 상용 모델로 비교
// - 상용 모델이 여러 개면 각각 별도 라인으로 표시
// - 상용 모델이 없으면 "동급 성능 상용 모델 참고 비용"으로
//   해당 OSS 모델과 같은 성능 등급의 대표 상용 모델을 자동 매칭
monthlyApi = calculateApiCost(commercialModel, inputs)
```

### 5.4 출력

- "API vs 셀프호스팅" 월간 비용 비교 카드
- 요청량 증가에 따른 손익분기점 라인 차트 (X축: 일 요청수, Y축: 월 비용)
  - X축 범위: 0 ~ max(현재 dailyRequests * 5, 손익분기점 * 2) (교차점이 항상 차트 내에 표시되도록)
  - 두 선이 교차하는 지점에 마커 표시
- "일 N건 이상이면 셀프호스팅이 유리합니다" 메시지
- 선택한 OSS 모델의 인프라 요구사항 요약 (VRAM, 권장 GPU)

---

## 6. 탭 3: 라우팅

### 6.1 활성화 조건

모델 2개 이상 선택 시 활성화. 1개만 선택 시 "2개 이상 모델을 선택하면 라우팅 시뮬레이션을 할 수 있습니다" 안내.

### 6.2 추가 입력

| 필드 | 타입 | 설명 |
|------|------|------|
| 모델별 트래픽 비율 | slider per model | 합계 100%, 연동 슬라이더 |

슬라이더 연동: 하나를 올리면 나머지가 비례 감소하여 합계 100% 유지.

### 6.3 비용 계산 공식

각 모델의 월간 API 비용은 탭 1(API 비용)과 동일한 `calculateApiCost()` 함수로 산출한다. 공통 입력(요청수, 토큰, 운영일)과 탭 1의 캐싱/배치 설정을 그대로 사용한다.

```
// 각 모델의 월간 비용 (탭 1과 동일 공식)
modelMonthlyCost[i] = calculateApiCost(models[i], commonInputs, tab1Settings)

routedCost = sum(modelMonthlyCost[i] * trafficRatio[i] for each model)

// 기준: 가장 비싼 모델로 100% 처리 시 비용
baselineCost = max(modelMonthlyCost[i] for each model)

savingsRate = (baselineCost - routedCost) / baselineCost * 100
```

### 6.4 출력

- 라우팅 적용 월간 비용 vs 단일 모델(최고가) 비용 비교
- 절감률 (%) 강조 표시
- 모델별 비용 기여도 스택드 바 차트
- 비율 변경 시 실시간 갱신 (디바운스 300ms, 전 탭 공통)

---

## 7. 데이터 변경

### 7.1 IModelPricing 확장

기존 `src/lib/types/model.ts`의 `IModelPricing`에 3개 필드를 추가한다. Mongoose 스키마(`src/lib/db/models/model.ts`)와 시드 스크립트도 함께 업데이트한다.

```typescript
// src/lib/types/model.ts — 기존 인터페이스에 추가
interface IModelPricing {
  readonly inputPer1m: number | null       // 기존
  readonly outputPer1m: number | null      // 기존
  readonly pricingType: string             // 기존
  readonly cachedInputPer1m: number | null // 신규: 캐싱 적용 input 단가
  readonly batchInputPer1m: number | null  // 신규: 배치 input 단가
  readonly batchOutputPer1m: number | null // 신규: 배치 output 단가
}
```

시드 데이터(`data/models.json`)에 주요 프로바이더 캐싱/배치 가격을 추가한다. null이면 `cost-calculator.ts`의 `resolvePrice()`에서 프로바이더별 할인율로 폴백 계산한다.

### 7.2 GPU 임대 시세

기존 `IGpuReference` 타입에 이미 `cloudHourly: number` 필드가 있다. 이 필드를 그대로 활용한다. 신규 필드 추가 불필요.

현재 시드 데이터에 cloudHourly 값이 없는 GPU가 있다면 Lambda Labs / RunPod 기준 참고 시세로 보강한다.

---

## 8. 파일 구조

```
src/
  app/simulator/page.tsx                    # 페이지 (server → client)
  components/simulator/
    model-selector.tsx                      # 모델 검색/선택 (최대 4개)
    common-inputs.tsx                       # 공통 입력 폼
    api-cost-tab.tsx                        # 탭 1: API 비용
    breakeven-tab.tsx                       # 탭 2: 손익분기점
    routing-tab.tsx                         # 탭 3: 라우팅
    cost-bar-chart.tsx                      # 비용 바 차트 (Recharts)
    breakeven-line-chart.tsx                # 손익분기점 라인 차트
    routing-stacked-chart.tsx               # 라우팅 스택드 바 차트
  lib/utils/cost-calculator.ts              # 비용 계산 순수 함수 (테스트 용이)
  lib/types/simulator.ts                    # 시뮬레이터 타입 정의
```

- 계산 로직은 `cost-calculator.ts`에 순수 함수로 분리하여 단위 테스트 가능
- 차트 컴포넌트 3개 분리 (각자 하나의 차트만 담당)

---

## 9. API 라우트

시뮬레이터 전용 API 라우트는 없다. 필요한 데이터:

- `GET /api/models` — 기존 모델 목록 API 활용 (pricing 포함)
- `GET /api/gpu` — 기존 GPU 목록 API 활용 (cloudHourly 필드 포함)

계산은 전부 클라이언트에서 수행한다.

---

## 10. 제외 사항

- 성능 지표 표시 (BVA 링크로 대체)
- 가격 이력 차트 (Phase 3 F8.2)
- PDF/CSV 내보내기 (Phase 2 후반)
- 서빙 프레임워크별 비용 차이 (F5.3과 통합 시 추후 검토)
