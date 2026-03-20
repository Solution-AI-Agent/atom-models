# Playground Metrics: Web Worker 기반 독립 측정

**Date:** 2026-03-20
**Status:** Approved
**Scope:** atom-models playground

## Problem

현재 playground에서 복수 모델의 응답을 동시 생성할 때, 모든 스트림이 브라우저 메인 스레드 하나에서 처리된다. `performance.now()`는 청크가 도착한 시점이 아닌 JS가 처리한 시점을 측정하므로, 모델 간 타이밍 간섭이 발생한다.

추가로 서버 측 SSE 파싱 버그 3건과 토큰 카운트 부정확 문제가 있다.

### 현재 발견된 문제

| 등급 | 문제 | 위치 |
|------|------|------|
| CRITICAL | tokenCount가 SSE 이벤트 수를 셈 (토큰 수 아님) | use-streaming-chat.ts |
| CRITICAL | usage+content 동시 도착 시 content 유실 | route.ts |
| HIGH | 스트림 종료 시 버퍼 미처리 (flush 없음) | route.ts, use-streaming-chat.ts |
| HIGH | usage 없으면 inputTokens=0 | use-streaming-chat.ts |
| MEDIUM | TPS/TTFT에 reasoning 토큰 혼합 | use-streaming-chat.ts |

## Requirements

- 각 모델의 스트림이 완전히 독립적으로 수치 측정
- TTFT/TPS를 reasoning과 content로 분리 측정
- metrics는 DB에 단일 소스로 저장, 분석/리포트 활용
- 최대 동시 4개 모델 (현재 3개에서 확장)

## Approach: Web Worker

각 모델마다 전용 Web Worker 스레드를 할당한다. fetch + SSE 파싱 + 타이밍 측정이 모두 독립 스레드에서 실행되어 타이밍 간섭이 없다.

대안으로 검토한 Server-Side Metrics(서버에서 측정)는 사용자 체감 TTFT를 측정할 수 없고, 하이브리드(Worker+Server)는 복잡도 대비 이득이 적어 제외했다.

## Architecture

```
Main Thread (UI만 담당)
├── page.tsx: handleSend → 각 Worker에 postMessage
├── useWorkerChat hook x4: onmessage → setState (렌더링)
└── 완료 시 setMessages + DB 저장

Worker Thread 0..3 (각 모델 전용, 독립 스레드)
├── fetch(apiBaseUrl + '/api/playground/chat')
├── SSE 파싱
├── performance.now()로 타이밍 측정
├── reasoning/content 분리 카운트
└── postMessage(chunks) / postMessage(done + metrics)

/api/playground/chat (서버, 기존 버그 수정)
├── usage+content 동시 도착 → content 먼저, usage 마지막
├── 스트림 종료 시 버퍼 flush
└── done 이벤트에 reasoningTokens 포함
```

### Worker Bundling (Next.js)

현재 프로젝트는 `output: 'standalone'`으로 Webpack 기반이다. Worker 인스턴스 생성 시 반드시 `new URL` 패턴을 사용해야 Webpack이 Worker 파일을 별도 청크로 번들링한다.

```typescript
// use-worker-chat.ts 내부
const worker = new Worker(
  new URL('../workers/stream.worker.ts', import.meta.url)
)
```

`next.config.ts` 변경은 불필요하다. Webpack 5는 `new URL(..., import.meta.url)` 패턴을 자동 인식하여 Worker 파일을 asset으로 번들링한다.

### Worker fetch URL

Web Worker는 `window.location`에 접근할 수 없으므로, API base URL을 `start` 메시지를 통해 전달해야 한다. hook에서 `window.location.origin`을 읽어 `start` 메시지의 `apiBaseUrl` 필드에 포함한다.

### 새로 만들 파일

- `src/workers/stream.worker.ts` — SSE 파싱 + 타이밍 측정
- `src/hooks/use-worker-chat.ts` — Worker 관리 + React 상태 연결
- `src/lib/types/worker-messages.ts` — Worker 메시지 타입 정의

### 수정할 파일

- `src/app/playground/page.tsx` — useStreamingChat → useWorkerChat, 최대 4개, fastestMetrics 로직 변경, gridColsClass 4컬럼 추가
- `src/app/api/playground/chat/route.ts` — 파싱 버그 3건 수정, reasoningTokens 추가
- `src/lib/types/playground.ts` — IPlaygroundMessageMetrics 확장, IPlaygroundChatStreamEvent 업데이트
- `src/components/playground/chat-column.tsx` — 4컬럼 레이아웃
- `src/components/playground/metrics-bar.tsx` — 분리된 metrics 표시

## Worker Message Types

```typescript
// src/lib/types/worker-messages.ts

// Main → Worker
type WorkerInboundMessage =
  | {
      readonly type: 'start'
      readonly apiBaseUrl: string
      readonly modelId: string
      readonly openRouterModelId: string
      readonly messages: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[]
      readonly parameters: IPlaygroundParameters
      readonly pricing: { readonly inputPer1m: number | null; readonly outputPer1m: number | null }
    }
  | { readonly type: 'abort' }

// Worker → Main
type WorkerOutboundMessage =
  | { readonly type: 'reasoning'; readonly content: string }
  | { readonly type: 'token'; readonly content: string }
  | {
      readonly type: 'done'
      readonly content: string
      readonly reasoning: string
      readonly metrics: IPlaygroundMessageMetrics
    }
  | { readonly type: 'error'; readonly error: string }
```

## Metrics Type

```typescript
interface IPlaygroundMessageMetrics {
  // Reasoning 측정
  readonly reasoningTtft: number | null
  readonly reasoningTps: number | null
  readonly reasoningTokens: number

  // Content 측정
  readonly contentTtft: number
  readonly contentTps: number
  readonly contentTokens: number

  // 공통
  readonly totalTime: number
  readonly inputTokens: number
  readonly estimatedCost: number
}
```

- `reasoningTtft/Tps` — reasoning이 없는 모델은 `null`
- `contentTtft` — 사용자 체감 TTFT (첫 content 토큰까지)
- 토큰 수는 OpenRouter `usage`가 권위적 소스. usage 없으면 Worker 카운트로 폴백

### IPlaygroundChatStreamEvent 업데이트

```typescript
interface IPlaygroundChatStreamEvent {
  readonly type: 'token' | 'reasoning' | 'done' | 'error'
  readonly content?: string
  readonly usage?: {
    readonly promptTokens: number
    readonly completionTokens: number
    readonly reasoningTokens?: number  // 신규
  }
  readonly error?: string
}
```

### 기존 세션 하위 호환

기존 저장된 세션은 old metrics 필드(`ttft`, `tps`, `outputTokens`)를 가진다. 로드 시 마이그레이션:

```typescript
// 기존 필드가 있고 신규 필드가 없으면 변환
// DB 레코드에 부분 데이터가 있을 수 있으므로 null coalescing 적용
if (metrics.ttft !== undefined && metrics.contentTtft === undefined) {
  return {
    reasoningTtft: null,
    reasoningTps: null,
    reasoningTokens: 0,
    contentTtft: metrics.ttft ?? 0,
    contentTps: metrics.tps ?? 0,
    contentTokens: metrics.outputTokens ?? 0,
    totalTime: metrics.totalTime ?? 0,
    inputTokens: metrics.inputTokens ?? 0,
    estimatedCost: metrics.estimatedCost ?? 0,
  }
}
```

이 변환은 `handleSelectSession`에서 세션 로드 시 1회 적용한다. DB의 기존 데이터는 수정하지 않는다 (lazy migration).

## Worker Communication Protocol

### Main → Worker

```typescript
// 스트림 시작
{ type: 'start', apiBaseUrl, modelId, openRouterModelId, messages, parameters, pricing }

// 스트림 중단
{ type: 'abort' }
```

### Worker → Main

```typescript
{ type: 'reasoning', content: string }  // reasoning 청크
{ type: 'token', content: string }      // content 청크
{ type: 'done', content, reasoning, metrics }  // 완료 + 최종 metrics
{ type: 'error', error: string }        // 에러
```

## Worker Lifecycle

1. **mount** — `useEffect` 내에서 `new Worker(new URL(..., import.meta.url))`로 인스턴스 생성, onmessage 핸들러 등록. Next.js SSR 시 Worker API가 없으므로 반드시 `useEffect`(브라우저 전용) 안에서 생성해야 한다
2. **sendMessage()** — state 초기화, `worker.postMessage({ type: 'start', apiBaseUrl: window.location.origin, ... })`, Promise 반환
3. **onmessage** — reasoning/token → setState, done → resolve(result), error → resolve(null)
4. **stop()** — `worker.postMessage({ type: 'abort' })`, Worker 내부 AbortController.abort(). 진행 중인 요청의 abort 응답이 돌아온 후에만 다음 start 가능 (hook이 isStreaming 상태로 가드)
5. **reset()** — state 초기화, Worker 재사용 (terminate 안 함)
6. **unmount** — worker.terminate()

### abort 레이스 컨디션 방지

`stop()` 호출 후 즉시 `sendMessage()`를 호출하면 이전 요청의 abort 응답과 새 요청이 충돌할 수 있다. 이를 방지하기 위해:
- hook은 `isStreaming` 상태를 관리하고, `sendMessage()`는 `isStreaming === true`일 때 무시한다
- Worker 내부에서도 `abort` 수신 시 현재 AbortController를 abort하고, 다음 `start` 수신 시 새 AbortController를 생성한다
- `page.tsx`의 `handleSend`는 `anyStreaming`이 true일 때 전송 버튼이 disabled되므로, 실질적으로 레이스가 발생하지 않는다

### Promise resolve 우선순위

Worker의 `onmessage`에서 `done`과 `error`가 각각 Promise를 resolve한다. Promise는 한 번만 resolve되므로:
- `done` 먼저 → resolve(result), 이후 error는 무시
- `error` 먼저 → resolve(null), 이후 done은 무시
- `aborted` error → resolve(null), hook은 에러 UI 미표시

정상적인 흐름에서는 `done`이 항상 마지막 메시지이며, `error` 후에 `done`이 오는 경우는 없다. Worker 내부에서 에러 발생 시 즉시 스트림 처리를 중단하고 `error`만 전송하기 때문이다.

## Worker Internal Measurement

```
startTime ─────────────────────────────────────────────────── endTime

  │ Reasoning Phase              │ Content Phase                │
  │                              │                              │
  │ 첫 chunk → reasoningTtft     │ 첫 chunk → contentTtft       │
  │  (startTime 기준 경과 시간)    │  (startTime 기준 경과 시간)    │
  │ 각 chunk → count++           │ 각 chunk → count++           │
  │ 마지막 → reasoningEndTime    │ 마지막 → contentEndTime      │
```

### TPS 계산 공식

각 phase의 TPS는 해당 phase 내에서의 처리 속도만 측정한다:

```
reasoningTps = reasoningTokens / ((reasoningEndTime - reasoningFirstTokenTime) / 1000)
contentTps   = contentTokens   / ((contentEndTime - contentFirstTokenTime) / 1000)
```

분모는 **해당 phase의 첫 토큰부터 마지막 토큰까지의 시간**이다. startTime이 아님에 주의.

### 토큰 수 계산

```
done 이벤트 수신 시:
  inputTokens     = usage.promptTokens (OpenRouter 제공, 권위적)
  reasoningTokens = usage.reasoningTokens ?? Worker 청크 카운트 (근사값, 아래 참고)
  contentTokens   = Math.max(0, usage.completionTokens - reasoningTokens)
  estimatedCost   = (inputTokens * inputPrice + (reasoningTokens + contentTokens) * outputPrice) / 1M
```

`contentTokens` 계산 시 `Math.max(0, ...)`로 음수를 방지한다 (일부 모델에서 reasoningTokens가 completionTokens를 초과하는 경우 대비).

### reasoningTokens 폴백 정확도

`usage.reasoningTokens`가 없을 때 Worker의 SSE 청크 카운트를 폴백으로 사용한다. 이는 **근사값**이다 — SSE 청크 하나에 토큰이 여러 개 포함될 수 있고, 부분 토큰만 올 수도 있다. 따라서 정확한 reasoning 토큰 수가 아닌 "청크 수 기반 추정치"로 취급해야 한다.

대부분의 OpenRouter 모델은 `stream_options: { include_usage: true }` 설정 시 `usage.reasoning_tokens`를 제공하므로, 폴백이 사용되는 경우는 드물다. 폴백 사용 시 `contentTokens` 계산도 근사값이 되므로, 비용 추정에도 오차가 발생할 수 있다.

### 비용 추정 제한사항

현재 pricing 구조는 `inputPer1m`과 `outputPer1m` 두 가지만 지원한다. reasoning 토큰과 content 토큰에 동일한 output 가격을 적용한다. 일부 프로바이더가 reasoning 토큰에 별도 가격을 책정하는 경우 비용 추정이 부정확할 수 있다. 향후 pricing에 `reasoningPer1m`을 추가하여 대응할 수 있으나, 현재 스코프에서는 제외한다.

## Server Bug Fixes (route.ts)

### BUG 1: usage+content 동시 도착 시 content 유실

```typescript
// Before: usage가 있으면 content 무시
if (usage) { sendDone() }
if (!usage && content) { sendToken() }  // skipped

// After: content/reasoning 항상 먼저 처리, usage는 마지막
if (reasoning) { sendReasoning() }
if (content) { sendToken() }
if (usage) { sendDone() }
```

참고: OpenRouter는 `stream_options: { include_usage: true }` 설정 시 usage를 **스트림의 마지막 청크에서만** 전송한다. 따라서 usage가 있는 청크에서 동시에 content가 있는 경우는 드물지만, 방어적으로 처리한다.

### BUG 2: 스트림 종료 시 버퍼 미처리

버퍼 flush가 필요한 지점이 **두 곳**이다:

1. **내부 루프**: SSE `data: [DONE]` 수신 시
2. **외부 루프**: `reader.read()`가 `done: true`를 반환할 때

```typescript
// processSSELine 헬퍼 함수를 추출하여 양쪽에서 사용

// 외부 루프: reader.read() done
const { done, value } = await reader.read()
if (done) {
  if (buffer.trim()) { processSSELine(buffer) }  // flush (외부)
  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
  closeStream()
  break
}

// 내부 루프: SSE [DONE] 수신
for (const line of lines) {
  if (data === '[DONE]') {
    // buffer는 이미 lines.pop()으로 분리됨 — 여기서도 flush
    if (buffer.trim()) { processSSELine(buffer) }  // flush (내부)
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    closeStream()
    return
  }
  processSSELine(line)
}
```

`processSSELine`은 기존 인라인 파싱 로직을 추출한 헬퍼 함수이다. 양쪽 flush 지점에서 동일한 함수를 호출한다.

### NEW: done 이벤트에 reasoningTokens 추가

```typescript
let reasoningChunkCount = 0

// 스트림 처리 중
if (reasoning) {
  reasoningChunkCount++
  sendReasoning()
}

// usage 수신 시 (스트림 마지막 청크)
if (usage) {
  sendDone({
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    reasoningTokens: usage.reasoning_tokens ?? reasoningChunkCount,
  })
}
```

## DB Storage

세션 메시지에 확장된 metrics를 임베딩하는 단일 소스. 별도 metrics 컬렉션 없이 MongoDB aggregation으로 분석.

```typescript
// PlaygroundSession.messages[] 내 assistant 메시지
{
  role: 'assistant',
  content: '답변 텍스트...',
  reasoning: '추론 텍스트...',
  modelId: '60f7b2...',
  metrics: {
    reasoningTtft: 85,
    reasoningTps: 42.1,
    reasoningTokens: 320,
    contentTtft: 2400,
    contentTps: 58.3,
    contentTokens: 160,
    totalTime: 5200,
    inputTokens: 1250,
    estimatedCost: 0.0089,
  },
  createdAt: '2026-03-20T...',
}
```

데이터가 수만 건 이상 쌓이면 별도 metrics 컬렉션 분리를 검토한다.

## page.tsx 변경사항

### fastestMetrics 로직 업데이트

기존 `metrics.ttft`/`metrics.tps` 참조를 새 필드로 교체한다:

```typescript
// contentTtft끼리, contentTps끼리 비교
if (msg.metrics!.contentTtft < lowestTtft) { ... }
if (msg.metrics!.contentTps > highestTps) { ... }
```

reasoning 모델과 non-reasoning 모델은 contentTtft/contentTps 기준으로 동일하게 비교한다.

### gridColsClass 4컬럼 추가

```typescript
const gridColsClass =
  selectedModels.length === 4
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    : selectedModels.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : selectedModels.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1'
```

### hook 호출 4개로 확장

```typescript
const stream0 = useWorkerChat(makeStreamOptions(selectedModels[0], ...))
const stream1 = useWorkerChat(makeStreamOptions(selectedModels[1], ...))
const stream2 = useWorkerChat(makeStreamOptions(selectedModels[2], ...))
const stream3 = useWorkerChat(makeStreamOptions(selectedModels[3], ...))
const streams = [stream0, stream1, stream2, stream3]
```

## Error Handling

### Worker 내부

- **fetch 실패** — postMessage({ type: 'error' }), Worker 종료 안 함 (재사용)
- **SSE 파싱 실패** — 개별 라인 skip, 연속 실패 카운터 유지 (성공 시 리셋). 연속 10회 실패 시 error로 전환
- **AbortError** — postMessage({ type: 'error', error: 'aborted' }), hook에서 에러 UI 미표시

### hook / page

- **Worker 생성 실패** — 모든 모던 브라우저 지원하므로 실질적 우려 없음. SSR 환경에서는 `useEffect` 안에서만 생성하여 방지
- **모델별 독립 에러** — A 실패해도 B, C, D 계속 진행. 실패 컬럼에만 에러 표시
- **DB 저장 실패** — UI에 결과 표시, 저장 실패는 조용히 무시 (현재와 동일)

## MetricsBar UI

Reasoning/Content를 시각적으로 분리 표시한다.

- Reasoning 블록: TTFT, TPS, tokens (보라색 좌측 보더)
- Content 블록: TTFT, TPS, tokens (파란색 좌측 보더)
- Total 블록: totalTime, input+output tokens, cost
- reasoning 없는 모델은 Content 블록만 표시
- 모델 간 비교 시 같은 카테고리(contentTps끼리, contentTtft끼리)만 비교하여 초록색 강조

## Testing Strategy

### Unit Tests

- **stream.worker.ts** — SSE 파싱, reasoning/content TTFT 분리 측정, TPS 분리 계산, usage 없을 때 폴백, 버퍼 flush, abort 시 정상 종료
- **route.ts** — usage+content 동시 도착 처리, 버퍼 flush, reasoningTokens 포함
- **metrics 계산** — estimatedCost 정확도, reasoning만/content만/둘 다, contentTokens 음수 방지

### Integration Tests

- **useWorkerChat hook** — Worker 생성 → 메시지 전송 → 응답 수신, streaming state 업데이트 순서, done 시 Promise resolve + metrics 반환, abort 처리, Worker 재사용
- **API route + DB** — 스트림 응답 → 세션 저장 → 조회 일치, 확장된 metrics 필드 저장/복원
- **기존 세션 마이그레이션** — old metrics 필드를 가진 세션 로드 시 변환 검증

### E2E Tests (Playwright)

- 2개 모델 선택 → 메시지 전송 → 양쪽 응답 완료 → metrics 표시 확인
- 4개 모델 동시 → 각 컬럼 독립 완료
- 스트리밍 중 중단 → 해당 컬럼만 중지
- 세션 저장 → 재로드 → metrics 복원

### Worker 격리 검증 (핵심)

Mock SSE 서버로 의도적 지연 차이를 만들어 Worker 간 타이밍 간섭 없음을 정량 검증한다.

- Model A: 첫 토큰 100ms, 이후 10ms 간격
- Model B: 첫 토큰 500ms, 이후 10ms 간격
- 검증: A.contentTtft가 B.contentTtft보다 최소 300ms 이상 작아야 한다 (상대 비교, 절대 오차 대신)

### Test Tools

- Unit/Integration: Vitest + @testing-library/react, Worker mock 직접 구현
- E2E: Playwright, mock OpenRouter 응답
