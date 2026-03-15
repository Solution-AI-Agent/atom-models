# 비용 시뮬레이터 개발 회고록

> 작성일: 2026-03-15
> 프로젝트: Atom Models - LLM 비교 및 최적화 플랫폼

---

## 1. 프로젝트 개요

선택한 모델(최대 4개)의 API 비용, 셀프호스팅 손익분기점, 라우팅 절감 효과를 하나의 페이지에서 시뮬레이션하는 기능을 구축했다. 계산은 전부 클라이언트 사이드에서 실시간 수행하며, 서버는 모델/GPU 데이터 제공만 담당한다.

**핵심 목표:**
- 모델별 API 비용 계산 (캐싱/배치 할인 적용)
- OSS vs 상용 모델 셀프호스팅 손익분기점 분석
- 멀티모델 라우팅 비용 절감 시뮬레이션
- Recharts 기반 실시간 차트 시각화

---

## 2. 작업 흐름

### 2.1 설계 (brainstorming + spec + plan)

brainstorming 스킬로 6개 질문을 통해 주요 설계 결정을 합의한 후, 설계 문서(spec)와 12개 태스크 구현 계획서(plan)를 작성했다.

| 결정 사항 | 선택 |
|-----------|------|
| 계산 방식 | 클라이언트 사이드 (순수 함수) |
| 차트 | Recharts (BarChart, LineChart, stacked BarChart) |
| 비용 모델 | 6세그먼트 분할 (realtime/cached/batch input + realtime/batch output + batch+cached) |
| 할인 적용 | Multiplicative stacking (배치+캐시 동시 적용) |
| GPU 데이터 | 기존 IGpuReference.cloudHourly 활용 |
| 전용 API | 없음 (기존 /api/models, /api/gpu 활용) |

### 2.2 구현 전략

```
Phase 1: Foundation (Task 1-4) — 타입, 시드, 계산기 (TDD)
Phase 2: UI Components (Task 5-10) — 페이지, 셀렉터, 3탭, 3차트
Phase 3: Integration (Task 11-12) — 와이어링, 디바운스, 최종 검증
```

### 2.3 Plan Review

plan-document-reviewer 서브에이전트로 리뷰 수행. 1 CRITICAL + 17 IMPORTANT 이슈 발견 후 수정:

| 구분 | 이슈 | 수정 내용 |
|------|------|----------|
| CRITICAL | breakeven null-test 로직 오류 | maxX 상대 비교 대신 고정 상한(1M) 적용 |
| IMPORTANT | Recharts `<rect>` 대신 `<Cell>` 사용 | Cell 컴포넌트로 교체 |
| IMPORTANT | PROVIDER_DISCOUNTS 타입 파일 배치 | cost-calculator.ts 내부로 이동 |
| IMPORTANT | import type 빌드 에러 | 값 import와 타입 import 분리 |
| IMPORTANT | 300ms 디바운스 누락 | useDebounce 훅 적용 |
| IMPORTANT | OSS 인프라 요구사항 미표시 | breakeven 탭에 VRAM/GPU 정보 추가 |
| IMPORTANT | GPU 수량 자동계산 미구현 | VRAM 기반 auto-calc useEffect 추가 |
| IMPORTANT | 컴포넌트 통합테스트 누락 | 4개 integration test 추가 |

---

## 3. 주요 설계 결정

### 3.1 6세그먼트 비용 모델

캐싱과 배치를 독립적으로 적용하여 input 토큰을 4세그먼트(realtime, cached, batch, batch+cached)로, output 토큰을 2세그먼트(realtime, batch)로 분할했다. 배치+캐시 동시 적용 시 multiplicative stacking으로 할인이 중첩된다.

```
batchCachedPrice = batchInputPer1m * (cachedInputPer1m / inputPer1m)
```

### 3.2 프로바이더별 폴백 할인율

모델에 명시적 캐싱/배치 가격이 없으면 프로바이더별 할인율로 자동 계산한다:

| 프로바이더 | 캐싱 할인 | 배치 할인 |
|-----------|----------|----------|
| Anthropic | 90% | 50% |
| Google | 75% | 50% |
| OpenAI | 50% | 50% |
| 기타 | 50% | 50% |

### 3.3 순수 함수 분리

모든 비용 계산 로직을 `cost-calculator.ts`에 순수 함수로 분리하여 UI와 완전히 독립적으로 단위 테스트 가능하게 했다. 13개 테스트가 계산 정확성을 보장한다.

### 3.4 손익분기점 null 조건

costPerRequest가 0인 경우(OSS 모델) 또는 손익분기점이 일 100만 건을 초과하는 경우 null로 처리하여 "해당 없음"으로 표시한다.

---

## 4. 결과 요약

### 4.1 산출물

| 구분 | 내용 |
|------|------|
| 커밋 | 11개 (e9a845b..1d3e334) |
| 파일 변경 | 19개 (신규 15 + 수정 4) |
| 코드 변경 | +1,704 / -84 |
| 테스트 | 2 suites, 17 tests 신규 (전체 50 suites, 309 tests) |

### 4.2 신규 구성요소

| 구분 | 파일 | 설명 |
|------|------|------|
| 타입 | `src/lib/types/simulator.ts` | 시뮬레이터 타입 정의 (63행) |
| 계산 | `src/lib/utils/cost-calculator.ts` | 순수 비용 계산 함수 (196행) |
| 페이지 | `src/app/simulator/page.tsx` | 서버 페이지 셸 |
| 클라이언트 | `src/components/simulator/simulator-client.tsx` | 메인 오케스트레이터 |
| 컴포넌트 | `src/components/simulator/model-selector.tsx` | 모델 검색/선택 (최대 4개) |
| 컴포넌트 | `src/components/simulator/common-inputs.tsx` | 공통 입력 폼 |
| 컴포넌트 | `src/components/simulator/api-cost-tab.tsx` | 탭 1: API 비용 |
| 컴포넌트 | `src/components/simulator/breakeven-tab.tsx` | 탭 2: 손익분기점 |
| 컴포넌트 | `src/components/simulator/routing-tab.tsx` | 탭 3: 라우팅 |
| 차트 | `src/components/simulator/cost-bar-chart.tsx` | 비용 바 차트 |
| 차트 | `src/components/simulator/breakeven-line-chart.tsx` | 손익분기점 라인 차트 |
| 차트 | `src/components/simulator/routing-stacked-chart.tsx` | 라우팅 스택드 바 차트 |
| UI | `src/components/ui/slider.tsx` | shadcn Slider 컴포넌트 |

### 4.3 수정된 기존 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/types/model.ts` | IModelPricing에 3개 필드 추가 |
| `src/lib/db/models/model.ts` | Mongoose 스키마에 3개 필드 추가 |
| `data/models.json` | 50개 모델에 cached/batch 가격 추가 |
| `src/components/layout/app-sidebar.tsx` | 시뮬레이터 네비게이션 항목 추가 |

### 4.4 테스트 커버리지

| 테스트 파일 | 테스트 수 | 대상 |
|------------|----------|------|
| cost-calculator.test.ts | 13 | resolvePrice, calculateApiCost, calculateBreakeven, calculateRouting |
| simulator.test.tsx | 4 | SimulatorClient 렌더링, 가이드 메시지, 탭 비표시 |

---

## 5. 발견 및 해결한 문제

### 5.1 빌드/타입 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| Slider 컴포넌트 미설치 | shadcn slider가 프로젝트에 없었음 | `npx shadcn add slider` 실행 |
| Slider onValueChange 타입 불일치 | base-ui Slider가 `number \| readonly number[]` 반환 | Array.isArray 분기 처리 |
| Recharts Tooltip formatter 타입 에러 | `ValueType \| undefined`를 `number`에 할당 불가 | `(value: unknown)` 시그니처로 변경 |
| Select onValueChange null 허용 | base-ui Select가 `string \| null` 반환 | `v ?? ''` 폴백 처리 |
| float 정밀도 (10 * 0.1 = 0.999...) | JS 부동소수점 | toBeCloseTo 매처 사용 |

### 5.2 Plan Review에서 발견된 설계 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| breakeven null-test가 항상 실패 | maxX가 breakevenDailyRequests * 2로 스케일되어 null 조건 미충족 | 고정 상한(1M)으로 변경 |
| PROVIDER_DISCOUNTS가 types 파일에 위치 | 런타임 상수가 타입 파일에 혼재 | cost-calculator.ts 내부로 이동 |
| import type으로 값을 import | TypeScript 빌드 에러 유발 | 값 import로 분리 |

---

## 6. 잘된 점

1. **Plan Review 효과적**: plan-document-reviewer가 1 CRITICAL + 17 IMPORTANT 이슈를 사전에 발견하여 구현 시 빌드 에러와 논리 오류를 예방했다.
2. **TDD로 계산 정확성 보장**: 13개 단위 테스트를 먼저 작성하여 6세그먼트 비용 모델의 정확성을 검증한 후 UI를 구축했다.
3. **순수 함수 분리**: 계산 로직을 UI에서 완전히 분리하여 테스트와 유지보수가 용이하다.
4. **기존 인프라 활용**: 새 API 라우트 없이 기존 `/api/models`, `/api/gpu`를 재활용하고, 기존 `useDebounce` 훅을 활용했다.
5. **빌드 검증 루프**: 각 단계에서 `next build`를 실행하여 타입 에러를 즉시 발견하고 수정했다.

---

## 7. 개선할 점

1. **shadcn 컴포넌트 사전 확인 부족**: Slider가 없어서 빌드 실패 후 추가했다. 계획 단계에서 의존 컴포넌트 목록을 확인했어야 한다.
2. **base-ui vs radix 타입 차이**: shadcn이 base-ui로 마이그레이션되면서 Slider, Select의 콜백 시그니처가 변경되었다. 계획서의 코드가 radix 기준이라 여러 타입 수정이 필요했다.
3. **Recharts 타입 엄격성**: Tooltip formatter 타입이 strict하여 단순 `(value: number) => string` 시그니처가 통과하지 않았다. Recharts의 타입 패턴을 사전에 파악했어야 한다.
4. **E2E 테스트 부재**: 컴포넌트 통합 테스트만 있고, 실제 모델 데이터와 차트 렌더링을 검증하는 E2E 테스트가 없다.
5. **상용 모델 없을 때 breakeven 비교 대상 자동 매칭 미구현**: spec에서 요구한 "동급 성능 상용 모델 자동 매칭" 로직을 단순화하여 `models[0]` 폴백으로 처리했다.

---

## 8. 후속 작업

| 우선순위 | 작업 | 비고 |
|----------|------|------|
| 높음 | 실사용 검증 (시드 데이터 로드 후 UI 테스트) | 차트 렌더링, 슬라이더 동작 확인 |
| 높음 | 동급 상용 모델 자동 매칭 | OSS만 선택 시 비교 대상 자동 선정 |
| 중간 | breakeven 다중 상용 모델 비교 | 여러 상용 모델 각각 별도 라인 표시 |
| 중간 | E2E 테스트 (Playwright) | 모델 선택 -> 탭 전환 -> 차트 확인 플로우 |
| 낮음 | PDF/CSV 내보내기 | Phase 2 후반 범위 |
| 낮음 | 가격 이력 차트 | Phase 3 F8.2 범위 |

---

## 9. 산출 문서 목록

| 문서 | 경로 |
|------|------|
| 설계 문서 (spec) | docs/specs/2026-03-15-spec-cost-simulator.md |
| 구현 계획서 (12 Tasks) | docs/plans/2026-03-15-plan-cost-simulator.md |
| 본 회고록 | docs/retros/2026-03-15-retro-cost-simulator.md |
