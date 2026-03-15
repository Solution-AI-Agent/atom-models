# Evaluation 기능 개발 회고록

> 작성일: 2026-03-15
> 프로젝트: Atom Models - LLM 비교 및 최적화 플랫폼

---

## 1. 프로젝트 개요

Arize Phoenix를 활용한 LLM-as-Judge 평가 기능을 구축했다. 사용자가 Q&A 데이터셋(CSV/Excel)을 업로드하면, 선택한 모델(최대 3개)이 응답을 생성하고, Phoenix 평가기(correctness/hallucination/relevance)가 자동으로 품질을 채점한다.

**핵심 목표:**
- Excel/CSV 업로드 후 Q&A 데이터 파싱 및 미리보기
- OpenRouter를 통한 1~3개 모델 응답 생성 (non-streaming)
- Phoenix 평가기로 LLM-as-Judge 자동 평가 (correctness, hallucination, relevance)
- 평가 결과 대시보드 + Phoenix 트레이스 링크
- Fire-and-forget 실행 + 폴링 기반 진행률 추적

---

## 2. 작업 흐름

### 2.1 설계 (brainstorming + spec + plan)

brainstorming 스킬로 주요 설계 결정을 합의한 후, 설계 문서와 16개 태스크 구현 계획서를 작성했다.

| 결정 사항 | 선택 |
|-----------|------|
| 평가 엔진 | Arize Phoenix (self-hosted) |
| 모델 호출 | OpenRouter (non-streaming completeChatCompletion) |
| Judge 모델 | openai/gpt-4o-mini via OpenRouter |
| 파일 파싱 | xlsx (SheetJS) — CSV/Excel 양쪽 지원 |
| 실행 방식 | Fire-and-forget (즉시 sessionId 반환, 클라이언트 폴링) |
| 보안 | Zod 검증 + DB 모델 허용목록 + IP Rate Limiting (3 req/min) |

### 2.2 팀 기반 에이전트 워크플로우 (Subagent-Driven Development)

4개 팀으로 16개 태스크를 분배 실행했다:

| 팀 | 역할 | 담당 태스크 |
|----|------|------------|
| foundation | 타입, 스키마, 의존성 | Task 1~3 (순차) |
| backend | 서비스, API 라우트, 테스트 | Task 4~10 (순차) |
| frontend | 컴포넌트, 페이지 | Task 11~15 (순차) |
| integration | 사이드바, 통합 | Task 16 |

### 2.3 병렬 실행 전략

```
Phase 1: foundation (타입 + 스키마 + 의존성)              ← 순차
Phase 2: backend (서비스 + API) || frontend (컴포넌트)     ← 병렬
Phase 3: integration (사이드바 + 빌드 검증)                ← Phase 2 의존
```

---

## 3. 주요 설계 결정

### 3.1 Fire-and-Forget 실행 패턴

평가는 모델 응답 생성 + LLM-as-Judge 채점까지 수 분이 소요된다. `/api/evaluation/run` 라우트는 세션 생성 직후 sessionId를 반환하고, 백그라운드에서 비동기 실행한다. 클라이언트는 `/api/evaluation/sessions/[id]/status`를 폴링하여 진행률을 추적한다.

### 3.2 Phoenix 통합 아키텍처

```
CSV Upload → Parse → Phoenix Dataset 생성
                         ↓
              모델별 runPhoenixExperiment
                  ↓              ↓
          OpenRouter 응답    Phoenix 평가기 (judge)
                  ↓              ↓
              experiment 결과 → DB 저장 + Phoenix UI 조회
```

LLM 호출(응답 생성 + judge)은 모두 우리 앱에서 OpenRouter를 통해 수행한다. Phoenix 서버는 데이터셋/실험 결과 저장 및 트레이스 시각화 역할만 담당하므로, Phoenix에 별도 LLM 프로바이더를 등록할 필요가 없다.

### 3.3 Non-Streaming 호출 추가

기존 `openrouter.service.ts`에는 SSE 스트리밍(`streamChatCompletion`)만 있었다. 평가용으로 `completeChatCompletion` 함수를 추가하여 `stream: false`로 호출하고 전체 응답을 한번에 받는다.

### 3.4 CSV UTF-8 디코딩

xlsx 라이브러리의 `XLSX.read(buffer, { type: 'array' })`는 CSV의 한글을 깨뜨린다. CSV 파일은 `TextDecoder('utf-8').decode(buffer)` 후 `{ type: 'string' }`으로 파싱하도록 분기 처리했다.

---

## 4. 결과 요약

### 4.1 산출물

| 구분 | 내용 |
|------|------|
| 커밋 | 19개 (14ba76d..0c110c2) |
| 파일 변경 | 42개 (신규 38 + 수정 4) |
| 코드 변경 | +7,270 / -15 |
| 테스트 | 6 suites, 45 tests 신규 (전체 48 suites, 292 tests) |

### 4.2 신규 구성요소

| 구분 | 파일 | 설명 |
|------|------|------|
| 타입 | `src/lib/types/evaluation.ts` | 전체 타입 정의 (121행) |
| DB | `src/lib/db/models/evaluation-session.ts` | Mongoose 스키마 |
| 서비스 | `src/lib/services/phoenix.service.ts` | Phoenix 클라이언트/데이터셋/실험 |
| 서비스 | `src/lib/services/evaluation.service.ts` | 세션 CRUD + 오케스트레이션 |
| 서비스 | `src/lib/services/openrouter.service.ts` | completeChatCompletion 추가 |
| API | `src/app/api/evaluation/upload/route.ts` | 파일 업로드 + 파싱 |
| API | `src/app/api/evaluation/run/route.ts` | 평가 실행 (fire-and-forget) |
| API | `src/app/api/evaluation/sessions/route.ts` | 세션 목록 |
| API | `src/app/api/evaluation/sessions/[id]/route.ts` | 세션 상세 |
| API | `src/app/api/evaluation/sessions/[id]/status/route.ts` | 상태 폴링 |
| 페이지 | `src/app/evaluation/page.tsx` | 설정 + 업로드 |
| 페이지 | `src/app/evaluation/result/[id]/page.tsx` | 결과 대시보드 |
| 페이지 | `src/app/evaluation/history/page.tsx` | 세션 히스토리 |
| 컴포넌트 | `src/components/evaluation/*` | 10개 UI 컴포넌트 |
| 테스트 데이터 | `test-data/*.csv` | 금융 상담 5개 세트 (70 Q&A) |

### 4.3 테스트 커버리지

| 테스트 파일 | 테스트 수 | 대상 |
|------------|----------|------|
| openrouter.service.test.ts | 6 | completeChatCompletion |
| phoenix.service.test.ts | 7 | health, dataset, evaluators, experiment |
| evaluation.service.test.ts | 10 | 세션 CRUD + 오케스트레이션 |
| upload.test.ts | 6 | 파일 업로드 + 파싱 + 검증 |
| run.test.ts | 8 | 실행 + Rate Limiting + 검증 |
| sessions.test.ts | 8 | 세션 목록/상세/상태 |

---

## 5. 발견 및 해결한 문제

### 5.1 빌드/타입 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| Readonly 배열 Mongoose 호환 불가 | `readonly IEvaluationModelConfig[]`을 Mongoose create()에 전달 | `map`/`spread`로 mutable 복사 |
| ObjectId → string 타입 불일치 | `serialize()` 반환 타입이 ObjectId 유지 | `as unknown as IEvaluationSession` 캐스트 |
| IEvaluationSessionDocument에 createdAt 누락 | `timestamps: true`가 인터페이스에 미반영 | `createdAt: Date` 필드 추가 |
| Zod v4 record 문법 변경 | `z.record(z.string())` → `z.record(z.string(), z.string())` | 2인자 형태로 수정 |
| zod ESM 트랜스폼 실패 | jest가 ESM zod 모듈을 처리 못함 | `transformIgnorePatterns`에 zod 허용 추가 |

### 5.2 UX 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| 사이드바에 Evaluation 메뉴 없음 | 잘못된 파일(`app-sidebar.tsx`) 수정 | 실제 파일(`layout/app-sidebar.tsx`) 수정 |
| CSV 한글 깨짐 | xlsx가 바이너리로 CSV 파싱 시 인코딩 무시 | TextDecoder('utf-8') 선 디코딩 후 string 모드 파싱 |

---

## 6. 잘된 점

1. **팀 병렬 실행**: backend/frontend를 독립 팀으로 병렬 실행하여 구현 속도를 높였다.
2. **설계 문서 선행**: 설계 spec + 16개 태스크 구현 계획을 먼저 작성하여 에이전트가 명확한 컨텍스트로 작업할 수 있었다.
3. **Phoenix 역할 분리**: Phoenix를 데이터 저장/시각화로만 한정하고, LLM 호출을 모두 OpenRouter로 통일하여 프로바이더 설정 의존을 제거했다.
4. **테스트 데이터 현실성**: 금융권 상담사-고객 대화 기반 70개 Q&A 세트를 만들어 실제 도메인 테스트가 가능하다.

---

## 7. 개선할 점

1. **잘못된 파일 수정**: `app-sidebar.tsx`(미사용 shadcn 템플릿)를 수정한 후 사이드바에 반영이 안 되어 시간을 낭비했다. 코드 트레이싱을 먼저 했어야 한다.
2. **진행률 추적 미세화**: 현재 모델당 0% → 100% 이진 진행률이다. 행 단위 진행률 추적이 없어 대규모 데이터셋에서 UX가 부족하다.
3. **에러 복구 없음**: 평가 중 실패 시 재시도 로직이 없다. 행 단위 실패/성공 추적과 부분 재실행이 필요하다.
4. **프론트엔드 실사용 검증 부족**: 컴포넌트를 만들었지만 실제 Phoenix 연동 E2E 테스트 없이 커밋했다. CSV 인코딩 문제가 실사용 시 발견된 것이 이를 증명한다.

---

## 8. 후속 작업

| 우선순위 | 작업 | 비고 |
|----------|------|------|
| 높음 | Phoenix 연동 E2E 테스트 | 실제 Phoenix 서버 기동 후 전체 플로우 검증 |
| 높음 | 행 단위 진행률 추적 | 현재 이진(0/100%) → 행 단위 퍼센트 |
| 높음 | 에러 복구/재시도 | 행 단위 실패 추적 + 부분 재실행 |
| 중간 | 결과 대시보드 Phoenix 링크 | experiment URL 생성 + 바로가기 |
| 중간 | Markdown 렌더링 | 모델 응답의 코드 블록/리스트 포맷팅 |
| 낮음 | PDF/CSV 리포트 내보내기 | 평가 결과 다운로드 |
| 낮음 | 평가기 커스텀 프롬프트 | 사용자 정의 평가 기준 |

---

## 9. 산출 문서 목록

| 문서 | 경로 |
|------|------|
| 설계 문서 | docs/specs/2026-03-13-spec-evaluation-feature.md |
| 구현 계획서 (16 Tasks) | docs/plans/2026-03-13-plan-evaluation-feature.md |
| 테스트 데이터 (5 CSV) | test-data/01~05-*.csv |
| 본 회고록 | docs/retros/2026-03-15-retro-evaluation-feature.md |
