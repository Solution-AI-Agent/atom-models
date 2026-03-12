# Evaluation Feature Design Spec

Phoenix 연동 LLM 평가 기능. 엑셀(Q&A)을 업로드하면 선택한 모델로 응답을 생성하고, Phoenix LLM-as-Judge로 평가를 수행한다.

## Requirements

- Excel(.xlsx/.csv) 업로드: 질문 + 정답(ground truth) 쌍
- 1~3개 모델 선택 → OpenRouter로 응답 생성
- Arize Phoenix(self-hosted)와 연동하여 LLM-as-Judge 평가 실행
- 핵심 지표는 atom-models UI에서 표시, 상세는 Phoenix 링크로 연결
- Phase 1: 동기 처리(수백 건), Phase 2에서 비동기 확장

## Architecture: Direct Integration

```
Excel Upload → Parse & Validate → OpenRouter (응답 생성)
  → Phoenix API (평가) → MongoDB (결과 저장) → UI + Phoenix 링크
```

atom-models 서버가 Phoenix REST API를 직접 호출한다. 별도 서비스나 OTEL 설정 없이 기존 Next.js API route에서 처리한다.

### 핵심 패키지

| Package | Function | Import Path |
|---------|----------|-------------|
| `@arizeai/phoenix-client` | `createClient` | `@arizeai/phoenix-client` |
| `@arizeai/phoenix-client` | `createDataset` | `@arizeai/phoenix-client/datasets` |
| `@arizeai/phoenix-client` | `runExperiment`, `asExperimentEvaluator` | `@arizeai/phoenix-client/experiments` |
| `@arizeai/phoenix-evals` | `createCorrectnessEvaluator` | `@arizeai/phoenix-evals/llm` |
| `@arizeai/phoenix-evals` | `createDocumentRelevanceEvaluator` | `@arizeai/phoenix-evals/llm` |
| `@arizeai/phoenix-evals` | `createHallucinationEvaluator` | `@arizeai/phoenix-evals/llm` |
| `@ai-sdk/openai` | `createOpenAI` | `@ai-sdk/openai` |
| `xlsx` (SheetJS) | `read`, `utils.sheet_to_json` | `xlsx` |

3종 모두 pre-built evaluator를 사용한다. 필요 시 `createClassifierFn`으로 커스텀 evaluator 추가 가능.

**신규 의존성:** `@arizeai/phoenix-client`, `@arizeai/phoenix-evals`, `@ai-sdk/openai`, `xlsx`

**Note:** `openrouter.service.ts`는 현재 `streamChatCompletion`(streaming 전용)만 있다. 평가용 non-streaming 함수 `completeChatCompletion`을 새로 추가해야 한다:

```typescript
// openrouter.service.ts에 추가
export async function completeChatCompletion(options: {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  maxTokens?: number
}): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number } }>
```

### 환경변수

| Variable | 설명 | Required |
|----------|------|----------|
| `PHOENIX_HOST` | Phoenix 서버 URL (예: `http://phoenix.internal:6006`) | Yes |
| `PHOENIX_API_KEY` | Phoenix 인증 키 | No (self-hosted) |
| `EVAL_JUDGE_MODEL` | Judge 모델 ID (default: `gpt-4o-mini`) | No |

## Data Flow (6 Steps)

### Step 1: Excel Upload & Parse

사용자가 `.xlsx` 또는 `.csv` 파일을 업로드한다. 서버에서 `xlsx` 라이브러리로 파싱하고 Zod 스키마로 검증한다.

- 필수 컬럼: `question`, `ground_truth`
- 선택 컬럼: `context`, `system_prompt`, `metadata`
- 파일은 메모리에서 파싱 후 폐기 (서버 저장 안함)
- 업로드 API에서 컬럼 구조, 행 수, 프리뷰(5행), **전체 파싱 결과(rows)** 반환
- 클라이언트가 파싱 결과를 state로 보관하고, run API에 parsed JSON으로 전달 (파일 재전송 불필요)
- Phase 1 행 수 제한: 최대 200행 (timeout 방지)

### Step 2: Phoenix Dataset 생성

`@arizeai/phoenix-client`의 `createDataset()`으로 Phoenix에 데이터셋을 등록한다.

```typescript
const { datasetId } = await createDataset({
  name: sessionName,
  description: `${fileName} - ${rowCount} rows`,
  examples: rows.map(row => ({
    input: { question: row.question, context: row.context },
    output: { answer: row.ground_truth },
    metadata: row.metadata ?? {},
  })),
})
```

### Step 3: 모델 응답 생성 (Task)

`runExperiment()`의 `task` 함수로 등록한다. 각 example의 question을 기존 `openrouter.service.ts`로 모델에 전송하고 응답을 수집한다.

- 선택된 모델별로 별도 experiment 실행 (최대 3개 병렬)
- non-streaming 호출 (평가용이므로 스트리밍 불필요)
- 시스템 프롬프트, temperature, maxTokens 등 파라미터 전달

### Step 4: LLM-as-Judge 평가 (Evaluators)

`@arizeai/phoenix-evals`의 pre-built evaluator 3종으로 evaluator를 생성한다.

Phase 1 기본 evaluator 3종:

| Evaluator | 구현 방식 | Labels |
|-----------|-----------|--------|
| Correctness | `createCorrectnessEvaluator` (pre-built) | correct (1) / incorrect (0) |
| Relevance | `createDocumentRelevanceEvaluator` (pre-built) | relevant (1) / irrelevant (0) |
| Hallucination | `createHallucinationEvaluator` (pre-built) | factual (1) / hallucinated (0) |

### Judge Model 구성

기본 `gpt-4o-mini` (비용 효율). 환경변수 `EVAL_JUDGE_MODEL`로 변경 가능.

Judge 모델은 OpenRouter를 통해 호출한다. `@ai-sdk/openai`의 `createOpenAI`로 OpenRouter를 AI SDK LanguageModel로 래핑:

```typescript
import { createOpenAI } from '@ai-sdk/openai'
import { createCorrectnessEvaluator } from '@arizeai/phoenix-evals/llm'

// OpenRouter를 AI SDK provider로 설정
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const judgeModel = openrouter(process.env.EVAL_JUDGE_MODEL ?? 'openai/gpt-4o-mini')

// pre-built evaluator에 judge model 전달
const correctnessEvaluator = createCorrectnessEvaluator({
  model: judgeModel,
})
```

### Step 5: 결과 저장 (MongoDB)

experiment 결과를 `evaluation_sessions` 컬렉션에 저장한다. Phoenix에도 저장되므로 이중 저장이며, atom-models UI에서 빠른 조회 + Phoenix 장애 시 결과 유지 목적이다.

### Step 6: UI 표시 + Phoenix 링크

atom-models의 `/evaluation/result/[id]` 페이지에서 핵심 지표를 표시하고, "Phoenix에서 상세 보기" 버튼으로 Phoenix UI의 experiment 페이지에 링크한다.

## DB Schema

### Collection: `evaluation_sessions`

```typescript
{
  _id: ObjectId,
  name: string,                       // "금융 도메인 QA 평가 - 2026-03-13"
  status: "pending" | "running" | "completed" | "failed",

  config: {
    models: [{
      modelId: ObjectId,              // ref → models
      slug: string,
      openRouterModelId: string,
      parameters: {
        temperature: number,
        maxTokens: number,
      },
    }],
    evaluators: string[],             // ["correctness", "relevance", "hallucination"]
    systemPrompt?: string,
    phoenixDatasetId?: string,         // Step 2 완료 후 설정 (생성 전에는 null)
  },

  dataset: {
    fileName: string,
    rowCount: number,
    columns: string[],
  },

  experiments: [{
    modelSlug: string,
    phoenixExperimentId: string,
    status: "pending" | "running" | "completed" | "failed",

    scores: {
      correctness?: number,           // 0~1 평균
      relevance?: number,
      hallucination?: number,
    },

    results: [{
      rowIndex: number,
      question: string,
      groundTruth: string,
      modelResponse: string,
      evaluations: {
        correctness?: { score: number, label: string, explanation: string },
        relevance?: { score: number, label: string, explanation: string },
        hallucination?: { score: number, label: string, explanation: string },
      },
      latencyMs: number,
      tokenCount: { input: number, output: number },
    }],

    metrics: {
      avgLatencyMs: number,
      totalTokens: { input: number, output: number },
      estimatedCost: number,
    },
  }],

  createdAt: Date,
  startedAt?: Date,
  completedAt?: Date,
}
```

## API Endpoints

| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/api/evaluation/upload` | Excel 파일 업로드 + 파싱 + 검증. `multipart/form-data`. Response: `{ columns, rowCount, preview, rows }` |
| POST | `/api/evaluation/run` | 평가 실행 시작. Request: `{ name, rows (parsed JSON), models[], evaluators[], systemPrompt?, parameters? }`. Response: `{ sessionId, status }` |
| GET | `/api/evaluation/sessions` | 세션 목록 (최근순). Response: `{ sessions[] }` |
| GET | `/api/evaluation/sessions/[id]` | 세션 상세 결과. Response: `{ session: EvaluationSession }` |
| GET | `/api/evaluation/sessions/[id]/status` | 실행 상태 polling. Response: `{ status, progress: { completed, total }, experiments[] }` |

## UI Pages

### `/evaluation` — Setup & Upload

2컬럼 레이아웃:
- 좌측: 파일 드래그앤드롭 업로드 영역 + 데이터 프리뷰 테이블
- 우측: 모델 선택(1~3개), evaluator 체크박스, 시스템 프롬프트, 파라미터(temperature, maxTokens)
- 하단: "Run Evaluation (N rows x M models)" 버튼 + 예상 시간/비용

### `/evaluation/result/[id]` — Result Dashboard

- 상단: 세션 요약 (이름, 행 수, 모델 수, 소요시간) + Phoenix 대시보드 링크 버튼
- 중단: 모델별 Score Card (evaluator별 평균 점수, 레이턴시, 비용, 토큰 수). 최고 성능 모델 하이라이트
- 중단: Recharts 바 차트 (evaluator별 모델 점수 비교)
- 하단: 개별 Q&A 결과 테이블 (질문, 모델별 Pass/Fail, 확장 시 상세 응답 + explanation)

### `/evaluation/history` — Session History

- 세션 목록 (카드 또는 테이블)
- 상태 뱃지: running (파랑), completed (초록), failed (빨강)
- 빠른 요약: 모델명, 평균 점수, 행 수, 생성 시간
- 클릭 시 result 페이지로 이동

## Components (10 new)

| Component | Page | 역할 |
|-----------|------|------|
| `evaluation-setup.tsx` | Setup | 전체 설정 폼 레이아웃 |
| `file-upload-zone.tsx` | Setup | 드래그앤드롭 파일 업로드 |
| `data-preview-table.tsx` | Setup | 업로드 데이터 프리뷰 |
| `evaluator-selector.tsx` | Setup | Evaluator 체크박스 목록 |
| `evaluation-progress.tsx` | Setup→Result | 실행 중 진행률 표시 |
| `score-summary-card.tsx` | Result | 모델별 점수 카드 |
| `score-comparison-chart.tsx` | Result | Recharts 바 차트 |
| `evaluation-result-table.tsx` | Result | 개별 Q&A 결과 테이블 |
| `session-list.tsx` | History | 히스토리 목록 |
| `session-status-badge.tsx` | History | 상태 뱃지 |

기존 Playground의 `model-selector.tsx`, `parameter-panel.tsx`를 재활용한다.

## Error Handling

| Scenario | 대응 |
|----------|------|
| Phoenix 서버 연결 실패 | 실행 전 health check (`GET /v1/datasets`). 실패 시 명확한 에러 메시지 반환 |
| OpenRouter 모델 호출 실패 | 해당 행을 "error"로 기록, 나머지 행 계속 진행. 결과 테이블에 별도 표시 |
| Judge 모델 평가 실패 | 해당 evaluator 점수를 null로 기록. 다른 evaluator는 정상 진행. 집계 시 null 제외 |
| Excel 파싱/검증 실패 | 업로드 단계에서 즉시 에러 반환. Zod 스키마로 컬럼 구조 검증, 에러 위치(행/열) 명시 |
| Phoenix dataset 생성 실패 | 세션을 "failed"로 기록. `phoenixDatasetId`는 optional (생성 전까지 null) |
| API route timeout | Railway HTTP proxy ~5분 제한. `maxDuration`은 Vercel 전용이므로 Railway에서는 효과 없음. Phase 1은 최대 200행으로 제한하여 timeout 방지. 대규모는 Phase 2 비동기로 대응 |

## Rate Limiting

`/api/evaluation/run`에 IP 기반 rate limiting 적용. 기존 Playground의 패턴(`20 req/min`)을 따르되, evaluation은 비용이 훨씬 크므로 더 낮은 제한:

- `/api/evaluation/run`: 3 req/min per IP
- `/api/evaluation/upload`: 10 req/min per IP
- 나머지 GET 엔드포인트: 제한 없음

## MongoDB Document Size

`experiments[].results[]` 배열이 inline으로 저장된다. MongoDB 16MB 문서 제한 고려:
- 200행 x 3모델 x ~2KB/결과 = ~1.2MB (안전)
- Phase 1의 200행 제한이 이를 보장
- Phase 2에서 대규모 지원 시 `evaluation_results` 별도 컬렉션으로 분리 검토

## File Structure

```
src/
  app/
    evaluation/
      page.tsx                        # Setup & Upload page
      result/[id]/page.tsx            # Result Dashboard page
      history/page.tsx                # Session History page
    api/evaluation/
      upload/route.ts                 # Excel upload + parse
      run/route.ts                    # Start evaluation
      sessions/route.ts               # List sessions
      sessions/[id]/route.ts          # Session detail
      sessions/[id]/status/route.ts   # Status polling
  lib/
    db/models/
      evaluation-session.ts           # Mongoose schema
    services/
      phoenix.service.ts              # Phoenix client + dataset + experiment
      evaluation.service.ts           # Orchestration (parse → create → run → save)
    types/
      evaluation.ts                   # TypeScript interfaces
  components/
    evaluation/
      evaluation-setup.tsx
      file-upload-zone.tsx
      data-preview-table.tsx
      evaluator-selector.tsx
      evaluation-progress.tsx
      score-summary-card.tsx
      score-comparison-chart.tsx
      evaluation-result-table.tsx
      session-list.tsx
      session-status-badge.tsx
```

## Phase 2 (Future)

- 비동기 처리: job queue (Bull/BullMQ) + worker process
- 커스텀 evaluator: 사용자 정의 프롬프트 템플릿 UI
- Judge 모델 UI 선택
- 결과 내보내기 (CSV/PDF)
- 대규모 데이터셋 (1000+ rows) 지원
- RAG 특화 evaluator (faithfulness, context relevance)
- 재시도 메커니즘 (실패한 행만 재실행)

## Sidebar Navigation

기존 사이드바의 `navItems` 배열에 "Evaluation" 항목을 추가한다. 현재 사이드바는 flat list 구조이므로, 기존 구조를 유지하면서 Playground 아래에 Evaluation을 추가:

```typescript
// app-sidebar.tsx의 navItems에 추가
{ title: "Evaluation", url: "/evaluation", icon: ClipboardCheck }
```

그룹 구조 변경은 하지 않는다 (기존 패턴 유지).
