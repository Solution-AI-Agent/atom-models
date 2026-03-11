# Phase 1 MVP 회고록

> 작성일: 2026-03-08
> 프로젝트: Atom Models - LLM 비교 및 최적화 플랫폼

---

## 1. 프로젝트 개요

비즈니스 사용자가 LLM 모델을 비교하고, 산업별 최적 모델을 추천받고, 비용을 시뮬레이션할 수 있는 웹 플랫폼의 MVP를 구축했다.

**핵심 목표:**
- 55개 LLM 모델 데이터 탐색 및 비교
- 산업별 모델 추천 (12개 프리셋, 5개 산업군)
- GPU 인프라 요구사항 조회
- Docker 컨테이너 배포 (Dockge 호환)

---

## 2. 기술 스택 결정

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 15 App Router | SSR + Server Components로 MongoDB 직접 호출 가능 |
| DB | MongoDB (Mongoose) | 유연한 스키마, Map 타입으로 벤치마크/언어점수 처리 |
| UI | shadcn/ui (New York, Zinc) | 사이드바 레이아웃, 반응형 모바일 지원 |
| 차트 | Recharts | BarChart로 벤치마크 시각화 |
| 테스트 | Jest + React Testing Library + Playwright | 단위/통합/E2E 전 범위 |
| 배포 | Docker 멀티스테이지 빌드 | standalone 출력으로 경량 이미지 |

---

## 3. 개발 과정

### 3.1 팀 기반 에이전트 워크플로우

8개 전문 에이전트가 병렬로 작업을 수행했다:

1. **설계 에이전트** - 아키텍처 문서, Mongoose 스키마 설계
2. **셋업 에이전트** - 프로젝트 초기화, shadcn/ui, Jest 설정
3. **백엔드 에이전트** - DB 모델, 서비스 레이어, API 라우트
4. **프론트엔드 에이전트** - 페이지 컴포넌트, 사이드바 레이아웃
5. **데이터 에이전트** - 시드 데이터 작성 (40 -> 55개 모델)
6. **테스트 에이전트** - 단위/통합 테스트 (114개, 91% 커버리지)
7. **E2E 에이전트** - Playwright 테스트
8. **인프라 에이전트** - Dockerfile, docker-compose.yml

### 3.2 TDD 적용

계획 단계에서 27개 태스크를 세분화하고, 각 태스크마다 테스트 먼저 작성 -> 구현 -> 리팩터링 사이클을 따랐다.

- 테스트 파일: 30개
- 테스트 케이스: 114개
- Statement 커버리지: 91%

### 3.3 데이터 수집

최종 55개 모델을 13개 프로바이더에서 수집:

| 프로바이더 | 모델 수 | 대표 모델 |
|-----------|---------|----------|
| OpenAI | 12 | GPT-5.4, GPT-4.1, o4-mini |
| Google | 8 | Gemini 3.1 Pro, Gemini 3 Flash |
| Anthropic | 6 | Claude Opus 4.6, Claude Sonnet 4.6 |
| Meta | 5 | Llama 4 Behemoth, Llama 4 Maverick |
| Alibaba | 5 | Qwen 3.5 72B, Qwen 3 235B |
| Mistral | 4 | Mistral Large 3 |
| xAI | 4 | Grok 4.1 |
| DeepSeek | 3 | DeepSeek V3.2, DeepSeek R1 |
| 기타 | 8 | Cohere, Amazon, Microsoft, Zhipu AI, 01.AI |

---

## 4. 해결한 주요 이슈

### 4.1 Mongoose 직렬화 오류

**문제:** Server Component에서 Mongoose `lean()` 결과를 Client Component에 전달 시 ObjectId 직렬화 실패

**해결:** `serialize()` 유틸리티 (`JSON.parse(JSON.stringify(doc))`)를 만들어 모든 서비스 레이어 반환값에 적용

### 4.2 MongoDB 인증 실패

**문제:** `.env.local`의 연결 문자열에 `?authSource=admin` 누락

**해결:** 연결 문자열에 인증 소스 파라미터 추가

### 4.3 Server/Client Component 경계

**문제:** `buttonVariants()`가 서버에서 호출되어 오류 발생

**해결:** 해당 컴포넌트에 `'use client'` 지시문 추가

### 4.4 빌드 오류 (6건 동시 수정)

**문제:** `force-dynamic` 미설정, `useSearchParams` Suspense 미래핑, shadcn `asChild` -> `render` 변경

**해결:** 모든 MongoDB 접근 페이지에 `export const dynamic = 'force-dynamic'` 추가, Suspense 바운더리 래핑

### 4.5 Jest 설정 문제

**문제:** `setupFilesAfterSetup` 오타 + `next/jest` ESM import

**해결:** `setupFilesAfterEnv`로 수정, `next/jest.js` 확장자 명시

---

## 5. 아키텍처 특징

### 서비스 레이어 패턴
Server Component에서 API 라우트를 거치지 않고 서비스 함수를 직접 호출한다. API 라우트는 외부 연동용으로만 제공.

### URL 기반 상태 관리
필터, 정렬, 비교 모델 목록을 모두 URL 파라미터로 관리하여 북마크/공유 가능.

### CompareContext
최대 4개 모델까지 비교 가능. 인증 없이 클라이언트 사이드에서 관리.

---

## 6. 정량 지표

| 지표 | 수치 |
|------|------|
| 총 소스 파일 | 133개 |
| 총 코드 라인 | ~7,500줄 |
| 테스트 커버리지 | 91% |
| 모델 데이터 | 55개 (13개 프로바이더) |
| 산업 프리셋 | 12개 (5개 산업군) |
| GPU 레퍼런스 | 11개 |
| 페이지 | 7개 (홈, 탐색, 상세, 비교, 추천, 추천상세, 인프라) |
| 커밋 수 | 19개 |
| Docker 이미지 | 멀티스테이지 빌드 |

---

## 7. 향후 계획 (Phase 2-3)

### Phase 2: 고급 분석
- 비용 시뮬레이터 (토큰 사용량 기반 월간/연간 예측)
- 벤치마크 비교 차트 (레이더 차트, 멀티 모델)
- 가격 변동 히스토리 그래프
- 모델 업데이트 알림

### Phase 3: 자동화
- HuggingFace/OpenRouter API 연동 자동 수집
- 가격 변동 추적 및 알림
- 사용자 맞춤 추천 알고리즘
- 성능 벤치마크 자동 업데이트

---

## 8. 교훈

1. **Mongoose + Next.js 조합**에서 직렬화 문제는 반드시 발생한다. 서비스 레이어에서 일괄 처리하는 패턴이 효과적이다.
2. **팀 기반 에이전트 병렬 실행**은 단일 에이전트 대비 속도가 크게 향상되지만, 에이전트 간 의존성 관리가 핵심이다.
3. **TDD**는 초기 투자 시간이 있지만, 빌드 오류 수정 시 회귀 방지에 즉각 효과를 발휘했다.
4. **시드 데이터 품질**이 플랫폼 가치를 좌우한다. 55개 모델의 가격/벤치마크를 최신 상태로 유지하는 것이 지속적 과제이다.
