# Playground 버그픽스 회고록

> 작성일: 2026-03-12
> 프로젝트: Atom Models - LLM 비교 및 최적화 플랫폼

---

## 1. 개요

Playground의 리즈닝 모델 관련 버그 3건 + UI 개선 1건을 수정했다.

**보고된 증상:**
- 리즈닝 모델이 오래 돌면 답변이 안 찍히는 현상
- 답변이 중복되어 나오는 현상
- 다른 채팅 컬럼에서 스트리밍 시 다른 컬럼에 영향
- 리즈닝 펼침 시 채팅창 전체에 스크롤이 붙어 접기 불가

---

## 2. 근본 원인 분석

### 2.1 리즈닝 모델 답변 미표시

**파일:** `src/app/api/playground/chat/route.ts`

서버 API 라우트에서 OpenRouter SSE 이벤트를 파싱할 때 `else if` 체인 사용:

```typescript
// Before (버그)
if (usage) { ... }
else if (reasoning) { ... }  // reasoning이 있으면
else if (content) { ... }    // content는 드롭됨!
```

일부 모델이 같은 delta에 `reasoning`과 `content`를 동시에 보내는 경우 content가 누락되었다. 또한 리즈닝이 길어져 스트림이 끊기면 `fullContent = ''`로 종료되어 UI에 아무것도 표시되지 않았다.

### 2.2 답변 중복 (React 상태 배칭 문제)

**파일:** `src/hooks/use-streaming-chat.ts`, `src/app/playground/page.tsx`

훅의 `sendMessage` 완료 시 두 상태 업데이트가 **다른 microtask**에서 실행:

1. `setState({ isStreaming: false, content: '' })` — sendMessage 내부 (microtask A)
2. `setMessages(prev => [...prev, result])` — handleSend의 await 이후 (microtask B)

React 18의 `queueMicrotask` 기반 플러시로 인해 `setState`의 플러시가 `setMessages` 호출보다 먼저 실행될 수 있었다. 결과적으로 두 번의 렌더가 발생하며, 그 사이에 스트리밍 버블과 최종 메시지가 동시에 보이는 순간이 생겼다.

### 2.3 Cross-column 간섭

**파일:** `src/components/playground/chat-column.tsx`

`getMessagesForModel`이 매 렌더마다 `filter()`로 **새 배열 참조**를 생성. `useEffect` 의존성이 `messages` (객체 참조)였기 때문에, 어떤 모델이 토큰을 수신할 때마다 **모든 컬럼**의 auto-scroll effect가 트리거되었다.

### 2.4 리즈닝 박스 스크롤

**파일:** `src/components/playground/message-bubble.tsx`

리즈닝 컨텐츠 div에 `max-height`나 `overflow` 제한이 없어서, 긴 리즈닝 내용이 채팅창 전체를 차지하며 접기 버튼이 뷰포트 밖으로 밀려났다.

---

## 3. 수정 내용

| # | 파일 | 수정 | 효과 |
|---|------|------|------|
| 1 | `route.ts` | `else if` → 독립 `if` 블록 | reasoning + content 동시 전달 |
| 2 | `use-streaming-chat.ts` | 성공 시 자동 `setState` 제거, `reset()` 함수 추가 | 상태 클리어를 부모에게 위임 |
| 3 | `use-streaming-chat.ts` | content 없고 reasoning만 있을 때 fallback | 타임아웃 시에도 결과 표시 |
| 4 | `page.tsx` | `setMessages` + `reset()`을 같은 sync context에서 호출 | React 배칭 보장, 중복 제거 |
| 5 | `chat-column.tsx` | `useEffect` dep: `messages` → `messages.length` | cross-column scroll 간섭 제거 |
| 6 | `message-bubble.tsx` | 리즈닝 div에 `max-h-60 overflow-y-auto` 추가 | 리즈닝 내부 스크롤, 접기 가능 |
| 7 | `parameter-panel.tsx` | "기본값" → "끄기" 라벨 변경 | 리즈닝 기본 비활성 의도 명확화 |

---

## 4. 핵심 교훈

### 4.1 React 18 배칭의 함정

async 함수 내에서 `setState`가 호출된 위치(await 전/후)에 따라 React의 microtask 플러시 타이밍이 달라진다. **상태 전환이 원자적이어야 할 때는 같은 synchronous context에서 모든 관련 state setter를 호출해야 한다.**

### 4.2 배열 참조와 useEffect

`Array.filter()`는 항상 새 참조를 반환한다. `useEffect` 의존성에 배열 객체를 넣으면 매 렌더마다 effect가 실행된다. append-only 배열은 `.length`가 더 안전한 의존성이다.

### 4.3 else if vs 독립 if

외부 API 응답을 파싱할 때 한 필드의 존재가 다른 필드를 배제한다고 가정하면 안 된다. 방어적으로 독립 `if` 블록을 사용하는 것이 안전하다.

---

## 5. 변경 통계

- 변경 파일: 6개
- 추가/수정: +30 / -12 lines
- 테스트: 42 suites, 247 tests 전체 통과
- 타입체크: 통과
