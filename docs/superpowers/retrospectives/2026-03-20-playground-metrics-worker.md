# 회고: Playground Metrics Web Worker 개선

**날짜:** 2026-03-20
**범위:** atom-models playground
**커밋 범위:** `0b94e0c..334a28e` (14개 커밋)
**파일 변경:** 20개 파일, +1,062줄 / -301줄

---

## 배경

playground에서 복수 모델의 응답을 동시 생성할 때, 모든 스트림이 브라우저 메인 스레드 하나에서 처리되어 모델 간 타이밍 측정이 간섭받는 문제가 있었다. 추가로 서버 측 SSE 파싱 버그 3건과 토큰 카운트 부정확 문제가 발견되었다.

## 수행한 작업

### 1. 코드리뷰 및 문제 진단

기존 playground 스트리밍 파이프라인 전체를 분석하여 6건의 문제를 식별했다:

| 등급 | 문제 |
|------|------|
| CRITICAL | tokenCount가 SSE 이벤트 수를 셈 (토큰 수 아님) |
| CRITICAL | usage+content 동시 도착 시 content 유실 |
| HIGH | 스트림 종료 시 버퍼 미처리 |
| HIGH | usage 없으면 inputTokens=0 |
| MEDIUM | TPS/TTFT에 reasoning 토큰 혼합 |
| MEDIUM | TTFT가 reasoning 시작 시점 포함 |

### 2. 설계 (브레인스토밍)

3가지 접근 방식(Web Worker / Server-Side Metrics / 하이브리드)을 비교하고, Web Worker 방식을 채택했다. Visual Companion을 활용하여 아키텍처 다이어그램, metrics 타입 구조, Worker 통신 프로토콜을 시각적으로 검토했다.

핵심 설계 결정:
- 각 모델마다 전용 Worker 스레드 할당 (최대 4개)
- TTFT/TPS를 reasoning과 content로 분리 측정
- metrics는 세션 메시지에 임베딩 (단일 소스)
- OpenRouter usage를 권위적 토큰 수 소스로 사용

### 3. Spec 작성 및 2차례 리뷰

설계 문서를 작성하고 2차례 spec review를 실행했다.

- 1차 리뷰: CRITICAL 3건, HIGH 5건, MEDIUM 5건 발견 → 전체 수정
- 2차 리뷰: 이전 8건 해결 확인, 신규 CRITICAL 2건, HIGH 3건 발견 → 전체 수정

주요 발견 및 수정:
- Worker 번들링: `new URL(..., import.meta.url)` 패턴 명시
- Worker fetch URL: `apiBaseUrl` 필드 추가 (Worker에서 `window.location` 접근 불가)
- 버퍼 flush: 외부/내부 루프 양쪽에 적용
- SSR 가드: Worker 생성을 `useEffect` 안에서만
- 기존 세션 하위 호환: lazy migration 로직

### 4. 구현 (Subagent-Driven Development)

9개 태스크로 분해하여 subagent 병렬 실행:

| 태스크 | 내용 | 실행 |
|--------|------|------|
| Task 1 | 타입 (playground.ts + worker-messages.ts) | 병렬 |
| Task 2 | 서버 SSE 버그 3건 수정 | 병렬 |
| Task 3 | DB 스키마 업데이트 | 병렬 |
| Task 4 | Stream Worker 구현 | 순차 (→Task 1) |
| Task 5 | useWorkerChat 훅 구현 | 순차 (→Task 4) |
| Task 6 | UI 컴포넌트 업데이트 | 병렬 (→Task 1) |
| Task 7 | page.tsx 통합 | 순차 (→Task 2,3,5,6) |
| Task 8 | 정리 (구 훅 삭제, 전체 테스트/빌드) | 순차 |
| Task 9 | Smoke Test | 수동 |

결과: 333개 테스트 통과, 빌드 성공

### 5. 런타임 버그 수정

Smoke test 중 발견한 추가 문제 2건을 수정했다:

- **stale closure 버그**: `useEffect([], ...)` 내 `onmessage` 핸들러가 초기 `modelId=''`를 캡처 → `modelIdRef`로 해결
- **reasoning 토큰 제어**: `reasoning.max_tokens` 파라미터가 일부 프로바이더에서 미지원 → `effort` 파라미터만 사용, non-thinking 모델은 `reasoning` 파라미터 자체 제거

### 6. UI 개선

- MetricsBar를 한글 레이블 + 접이식 상세 패널로 개선
- 기본 maxTokens를 16384 → 4096으로 조정

---

## 최종 산출물

### 새로 생성된 파일 (5개)

| 파일 | 역할 |
|------|------|
| `src/workers/stream.worker.ts` | 독립 스레드에서 SSE 파싱 + 타이밍 측정 |
| `src/hooks/use-worker-chat.ts` | Worker 생명주기 + React 상태 브릿지 |
| `src/lib/utils/create-stream-worker.ts` | Worker 팩토리 (Jest 테스트 호환) |
| `src/lib/types/worker-messages.ts` | Worker 메시지 discriminated union 타입 |
| `docs/superpowers/specs/2026-03-20-playground-metrics-worker-design.md` | 설계 문서 |

### 수정된 파일 (10개)

| 파일 | 변경 |
|------|------|
| `src/app/api/playground/chat/route.ts` | SSE 파싱 버그 3건 수정 + reasoningTokens |
| `src/app/api/playground/sessions/[id]/route.ts` | Zod 스키마 새 필드 반영 |
| `src/app/playground/page.tsx` | useWorkerChat x4, 4컬럼, fastestMetrics, migration |
| `src/lib/types/playground.ts` | IPlaygroundMessageMetrics 분리 필드 |
| `src/lib/db/models/playground-session.ts` | 스키마에 분리 metrics 필드 추가 |
| `src/lib/services/openrouter.service.ts` | thinkingMode 분기, effort 파라미터 |
| `src/components/playground/metrics-bar.tsx` | 한글 레이블 + 접이식 상세 |
| `src/components/playground/message-bubble.tsx` | isFastest 타입 변경 |
| `src/components/playground/chat-column.tsx` | fastestMetrics 타입 변경 |
| `src/components/playground/model-selector.tsx` | MAX_MODELS 3→4 |

### 삭제된 파일 (1개)

| 파일 | 사유 |
|------|------|
| `src/hooks/use-streaming-chat.ts` | useWorkerChat로 완전 교체 |

---

## 잘한 점

1. **spec review 2차례 실행**으로 구현 전에 CRITICAL 이슈 5건을 사전에 잡았다 (Worker 번들링, fetch URL, 버퍼 flush, import.meta.url, 세션 마이그레이션)
2. **subagent 병렬 실행**으로 Tasks 1/2/3을 동시 진행, Tasks 5/6을 동시 진행하여 구현 시간을 단축했다
3. **TDD**로 모든 태스크를 RED→GREEN으로 진행하여 333개 테스트 통과 상태를 유지했다
4. **stale closure 버그**를 smoke test에서 즉시 발견하고 원인 분석→수정을 빠르게 완료했다

## 개선할 점

1. **stale closure 문제를 spec/plan 단계에서 못 잡았다.** `useEffect([], ...)` 안에서 외부 props를 참조하는 패턴은 흔한 실수인데, 2차례 리뷰에서도 발견하지 못했다. hook 설계 시 "어떤 값이 클로저에 캡처되는가"를 체크리스트로 추가할 필요가 있다.
2. **`reasoning.max_tokens` 호환성을 사전에 확인하지 않았다.** OpenRouter API 호환성을 코드 작성 전에 문서나 테스트 호출로 확인했어야 한다. 결과적으로 3번의 커밋이 필요했다 (추가→대체→제거).
3. **E2E 테스트 미작성.** spec에 명시된 Playwright E2E 테스트 4건과 Worker 격리 타이밍 검증 테스트를 아직 구현하지 않았다. 후속 작업으로 남아있다.

## 후속 작업

- [ ] Playwright E2E 테스트 4건 (2모델, 4모델, 중단, 세션 복원)
- [ ] Worker 격리 타이밍 검증 테스트 (Mock SSE 서버)
- [ ] 모델별 예상 속도 표시 (DB 벤치마크 데이터 활용)
- [ ] 모델 상세 페이지에서 세션 metrics 집계/추이 차트

---

## DB 마이그레이션

Mongoose 유연 스키마로 별도 마이그레이션 불필요. 기존 세션 문서는 `handleSelectSession`의 lazy migration으로 처리된다. 시드 변경 없음.
