# Playground 기능 개발 회고록

> 작성일: 2026-03-11
> 프로젝트: Atom Models - LLM 비교 및 최적화 플랫폼

---

## 1. 프로젝트 개요

LLM 모델 응답을 실시간으로 비교할 수 있는 인터랙티브 플레이그라운드를 구축했다. OpenRouter API를 단일 게이트웨이로 사용하여 최대 3개 모델에 동시에 프롬프트를 전송하고, 각 모델의 스트리밍 응답을 나란히 비교할 수 있다.

**핵심 목표:**
- 최대 3개 모델 선택 후 병렬 SSE 스트리밍으로 실시간 응답 비교
- 성능 메트릭(TTFT, TPS, 토큰 수, 비용) 자동 측정 및 최고 성능 하이라이트
- 리즈닝 모델(DeepSeek R1, GLM-4.7 등) 사고 과정 분리 표시
- 멀티턴 대화 + 세션 저장/복원
- 모바일 반응형 레이아웃

---

## 2. 작업 흐름

### 2.1 브레인스토밍 (설계 논의)

brainstorming 스킬을 활용하여 10가지 핵심 결정을 순차적으로 합의했다:

| # | 질문 | 결정 |
|---|------|------|
| 1 | API 게이트웨이 | OpenRouter 단일 게이트웨이 (서버 사이드 키) |
| 2 | 모델 수 | 최대 3개, DB 기반 선택 (openRouterModelId 필터) |
| 3 | 스트리밍 방식 | 모델별 독립 SSE, 병렬 비동기 |
| 4 | 대화 형태 | 멀티턴 지원 (단순 시작, 점진 확장) |
| 5 | 시스템 프롬프트 | 공통 1개 |
| 6 | 메트릭 | TTFT + 총 시간 + TPS + 토큰 수 + 비용 |
| 7 | 세션 저장 | MongoDB 기록 + 세션 목록 Sheet |
| 8 | 파라미터 | 기본 공통, 모델별 오버라이드 가능 |
| 9 | 모바일 | 수직 스택 |
| 10 | 리즈닝 | 사고 과정 분리 표시 (접이식 섹션) |

### 2.2 팀 기반 에이전트 워크플로우

TeamCreate를 활용하여 3명의 전문 에이전트가 18개 태스크를 수행했다:

| 팀원 | 역할 | 담당 |
|------|------|------|
| backend-dev | DB 모델, API 라우트, 서비스, 보안 | Task 1-6, 13-15 |
| frontend-dev | 컴포넌트, 훅, 페이지 통합 | Task 7-12, 16-17 |
| seed-mapper | OpenRouter ID 매핑, 시드 데이터 | Task 18 |

### 2.3 병렬 실행 전략

```
Phase A: backend-dev (DB + Service) + seed-mapper (매핑 조사) ← 병렬
Phase B: backend-dev (API Routes) + frontend-dev (컴포넌트)    ← 병렬
Phase C: frontend-dev (페이지 통합)                           ← Phase B 의존
Phase D: 보안 리뷰 + 수정                                     ← Phase C 의존
```

---

## 3. 주요 설계 결정

### 3.1 React Hooks 규칙과 동적 모델 수

선택된 모델 수(0~3)에 관계없이 항상 3개의 `useStreamingChat` 훅을 호출한다. React의 "조건부 훅 호출 금지" 규칙을 준수하면서, 선택되지 않은 슬롯은 빈 옵션으로 초기화하여 비활성 상태를 유지한다.

```typescript
const stream0 = useStreamingChat(makeStreamOptions(selectedModels[0], ...))
const stream1 = useStreamingChat(makeStreamOptions(selectedModels[1], ...))
const stream2 = useStreamingChat(makeStreamOptions(selectedModels[2], ...))
```

### 3.2 SSE 프록시 보안 설계

서버 사이드 API 라우트가 OpenRouter를 프록시하는 구조에서 3가지 보안 계층을 적용했다:

| 계층 | 구현 | 목적 |
|------|------|------|
| Zod 검증 | chatRequestSchema | 입력 파라미터 타입/범위 강제 |
| 모델 허용목록 | DB에서 openRouterModelId 존재 확인 | 임의 모델 호출 방지 (비용 악용 차단) |
| Rate Limiting | IP 기반 20 req/min, in-memory | 과도한 API 호출 방지 |

### 3.3 리즈닝 모델 대응

GLM-4.7 등 리즈닝 모델은 `delta.reasoning` 필드로 사고 과정을 전송한다. 초기에는 content와 합쳐서 표시했으나, 사용자 요청에 따라 분리 구현했다:

- **서버**: `type: 'reasoning'`과 `type: 'token'` 이벤트 분리
- **훅**: `content`와 `reasoning` 상태 독립 추적
- **UI**: 접이식 섹션 + BrainCircuit 아이콘 + 실시간 애니메이션

### 3.4 모델 데이터 큐레이션

87개 모델에서 50개로 정제했다. 주요 기준:

| 구분 | 프로바이더 | 모델 범위 |
|------|-----------|----------|
| 상용 | OpenAI | GPT-5.4, 4o, 4.1 계열 |
| 상용 | Anthropic | Opus/Sonnet 4.6, Haiku 4.5 |
| 상용 | Google | Gemini 3.x + 2.5 |
| 상용 | xAI | Grok 4.x + 3 |
| OSS | OpenAI | GPT-OSS 120B, 20B |
| OSS | Google | Gemma 3 |
| OSS | Zhipu | GLM-5, 4.7, 4.7-Flash |
| OSS | Moonshot | Kimi K2.5, K2 |
| OSS | Alibaba | Qwen 3.5 (전 가중치) |
| OSS | DeepSeek | V3.2 + R1 (전 가중치) |

---

## 4. 결과 요약

### 4.1 산출물

| 구분 | 내용 |
|------|------|
| 커밋 | 27개 (31d5042..c860213) |
| 파일 변경 | 32개 (신규 24 + 수정 8) |
| 코드 변경 | +5,902 / -4,073 (모델 데이터 정리 포함) |
| 테스트 | 42 suites, 247 tests 전체 통과 |

### 4.2 신규 구성요소

| 구분 | 파일 | 설명 |
|------|------|------|
| 페이지 | `src/app/playground/page.tsx` | 메인 페이지 (320행) |
| API | `src/app/api/playground/chat/route.ts` | SSE 스트리밍 프록시 |
| API | `src/app/api/playground/sessions/route.ts` | 세션 CRUD |
| API | `src/app/api/playground/sessions/[id]/route.ts` | 세션 개별 조작 |
| 서비스 | `src/lib/services/playground.service.ts` | 세션 CRUD 로직 |
| 서비스 | `src/lib/services/openrouter.service.ts` | OpenRouter 호출 |
| 훅 | `src/hooks/use-streaming-chat.ts` | SSE 스트리밍 + 메트릭 |
| 컴포넌트 | `src/components/playground/*` | 8개 UI 컴포넌트 |
| DB | `src/lib/db/models/playground-session.ts` | Mongoose 모델 |
| 타입 | `src/lib/types/playground.ts` | 전체 타입 정의 |

### 4.3 데이터 변경

| 데이터 | 변경 |
|--------|------|
| models.json | 87개 -> 50개 큐레이션 (8개 프로바이더) |
| Model 스키마 | openRouterModelId 필드 추가 |
| 시드 테스트 | GGUF 양자화 필드 optional 반영 |

---

## 5. 발견 및 해결한 문제

### 5.1 보안 이슈 (코드 리뷰 후 수정)

| 심각도 | 문제 | 해결 |
|--------|------|------|
| CRITICAL | API 엔드포인트 입력 검증 없음 | Zod 스키마 추가 |
| CRITICAL | 임의 모델 ID로 OpenRouter 호출 가능 | DB 허용목록 검증 |
| CRITICAL | Rate limiting 없음 | IP 기반 20 req/min |
| HIGH | SSE 라인 버퍼링 미비 (TCP 청크 분할 시 토큰 손실) | buffer 변수로 불완전 라인 유지 |
| HIGH | 에러 메시지 원문 노출 | JSON 파싱 후 `.error` 필드만 추출 |
| HIGH | 세션 메시지 무한 누적 | MAX_MESSAGES_PER_SESSION = 200 |

### 5.2 기능 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| 모델 선택기에 모델 없음 | DB에 openRouterModelId 미존재 | 시드 데이터에 매핑 추가 |
| GLM-4.7 응답 미표시 | delta.reasoning 필드 사용 (delta.content 아님) | reasoning/content 이벤트 분리 |
| SheetTrigger 렌더링 에러 | base-ui의 asChild 지원 방식 차이 | render prop으로 전환 |

---

## 6. 잘된 점

1. **브레인스토밍 우선**: 10가지 설계 결정을 코딩 전에 합의하여 구현 중 방향 전환이 최소화됐다.
2. **코드 리뷰 즉시 적용**: CRITICAL/HIGH 보안 이슈 6건을 리뷰 직후 수정하여 취약점 노출 시간을 최소화했다.
3. **SSE 버퍼링**: TCP 청크 분할 문제를 사전에 포착하여 토큰 손실을 방지했다.
4. **리즈닝 모델 대응**: GLM-4.7 테스트 중 발견한 문제를 즉시 해결하고, 단순 합산이 아닌 분리 표시로 UX를 개선했다.
5. **모델 데이터 큐레이션**: 87개에서 50개로 정제하면서 최신 세대 + 주요 프로바이더에 집중했다.

---

## 7. 개선할 점

1. **한 번에 너무 많은 커밋**: 27개 커밋이 단일 push에 포함됐다. 기능 단위로 중간 push를 하여 CI 피드백을 일찍 받았으면 더 좋았다.
2. **GPT-OSS OpenRouter ID 누락**: 2개 모델(GPT-OSS 120B/20B)이 OpenRouter에 등록되지 않아 플레이그라운드에서 선택 불가하다. 시드 데이터 작성 시 OpenRouter 가용 여부를 먼저 확인해야 한다.
3. **벤치마크 데이터 미반영**: 큐레이션된 50개 모델의 `benchmarks`와 `languageScores`가 모두 빈 객체다. 별도 데이터 보강 작업이 필요하다.
4. **Rate Limiter 인메모리**: 서버 재시작 시 리셋되고 멀티 인스턴스 환경에서 공유되지 않는다. Redis 기반 전환을 검토해야 한다.
5. **리즈닝 모델 자동 판별 없음**: 어떤 모델이 리즈닝 모델인지 DB에 표시가 없어 UI에서 사전 안내가 불가하다. 모델 스키마에 `supportsReasoning` 플래그 추가를 검토할 필요가 있다.

---

## 8. 후속 작업

| 우선순위 | 작업 | 비고 |
|----------|------|------|
| 높음 | 50개 모델 벤치마크 데이터 보강 | benchmarks, languageScores 채우기 |
| 높음 | GPT-OSS OpenRouter 등록 확인 | 미등록 시 대체 엔드포인트 검토 |
| 중간 | 모델에 supportsReasoning 플래그 추가 | 리즈닝 모델 UI 사전 안내 |
| 중간 | Rate Limiter Redis 전환 | 프로덕션 멀티 인스턴스 대비 |
| 낮음 | 비교 세션 공유 기능 | URL 기반 세션 공유 |
| 낮음 | 응답 Markdown 렌더링 | 코드 블록, 리스트 등 포맷팅 |

---

## 9. 산출 문서 목록

| 문서 | 경로 |
|------|------|
| 플레이그라운드 설계서 | docs/plans/2026-03-11-plan-playground-design.md |
| 구현 계획서 (18 Tasks) | docs/plans/2026-03-11-plan-playground-implementation.md |
| OpenRouter 모델 매핑 | data/openrouter-model-mapping.json |
| 본 회고록 | docs/retros/2026-03-11-retro-playground.md |
