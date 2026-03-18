# Playground 추론 모델 버그픽스 및 GPT-OSS 확장 회고록

> 작성일: 2026-03-18
> 프로젝트: Atom Models - LLM 비교 및 최적화 플랫폼

---

## 1. 개요

Playground의 추론(reasoning) 모델 관련 버그 수정, GPT-OSS 모델 OpenRouter 연동, 세션 데이터 무결성 보강을 진행했다.

**작업 범위:**
- 추론 모델 reasoning 제어 버그 수정 (10 커밋)
- GPT-OSS 모델 3종 OpenRouter 연동
- GLM 모델 thinkingMode 보정
- 세션 저장/복원 데이터 손실 수정
- 세션 이력 모델 표시 로직 개선

---

## 2. 근본 원인 분석

### 2.1 추론 모델 답변 미표시 — OpenRouter 모델별 동작 차이

**핵심 발견:** OpenRouter의 `reasoning` 파라미터 처리가 모델마다 크게 다르다.

| 파라미터 | GPT-OSS | GLM 4.7 | Qwen 3.5 | DeepSeek R1 |
|---------|---------|---------|----------|-------------|
| `effort: 'none'` | 400 에러 (필수) | - | - | - |
| `exclude: true` | 정상 | **content: null** | 정상 | 정상 |
| 파라미터 없음 | 정상 | reasoning 출력 | **content: null** | 정상 |
| `effort: 'low'` | 정상 | 정상 | 정상 | 정상 |

- **GPT-OSS:** reasoning이 아키텍처 필수. `effort: 'none'` 거부.
- **GLM 4.7:** `exclude: true` 사용 시 content까지 null 반환.
- **Qwen 3.5:** `reasoning` 파라미터 없이 보내면 content가 null, 모든 출력이 reasoning 필드로만 감.

### 2.2 Qwen의 과도한 추론 토큰 소비

단순 질문 "한국의 수도는?"에 대한 토큰 사용량:

| 모델 | effort | 추론 토큰 | 답변 토큰 |
|------|--------|----------|----------|
| GPT-OSS 20B | low | 27 | 18 |
| Qwen 3.5 9B | low | 383 | ~15 |
| Qwen 3.5 27B | low | 769 | 15 |
| Qwen 3.5 9B | high | 3,299 | ~15 |

Qwen은 아키텍처 레벨에서 과도하게 추론. `maxTokens: 4096`이면 복잡한 질문에서 추론이 토큰 예산을 소진하여 답변이 생성되지 않음.

### 2.3 세션 스키마 누락

Mongoose `PlaygroundSession` 스키마에 `reasoningEffort`와 `reasoning` 필드가 없어서 세션 저장 시 데이터가 silent drop됨. 복원 시 추론 설정과 추론 내용이 소실.

---

## 3. 시도한 접근과 실패

### 3.1 `reasoning: { exclude: true }` 전략 (실패)

**의도:** thinkingMode 모델에 `exclude: true`를 보내 reasoning 출력 억제.
**결과:** GLM 4.7에서 content까지 null 반환. 모델별 동작이 달라 범용 사용 불가.

### 3.2 `reasoning: { effort: 'none', exclude: true }` 전략 (실패)

**의도:** 지원 모델은 reasoning 비활성화, 미지원 모델은 출력 숨김.
**결과:** GPT-OSS가 `effort: 'none'`을 400으로 거부. 양립 불가.

### 3.3 서버 사이드 reasoning 필터링 (부분 실패)

**의도:** `forwardReasoning` 플래그로 reasoning 이벤트를 클라이언트에 미전달.
**결과:** Qwen처럼 reasoning phase가 긴 모델에서 UI가 수십 초간 빈 상태. 사용자가 멈춘 것으로 인식.

---

## 4. 최종 해결책

### 4.1 항상 `reasoning: { effort }` 전송

```typescript
// openrouter.service.ts
reasoning: { effort: options.parameters.reasoningEffort },
```

- "끄기" 옵션 제거. Low / Medium / High만 제공.
- 기본값: `low` — 모든 모델에서 안정적으로 동작.
- Qwen의 content 분리 문제 해결 (reasoning 파라미터 필수).

### 4.2 reasoning 이벤트 항상 전달

```typescript
// route.ts — 필터링 없이 항상 전달
if (!usage && reasoning) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', content: reasoning })}\n\n`))
}
```

추론 중이면 UI에 "생각 중..." 표시. 사용자가 모델 동작 상태를 확인 가능.

### 4.3 maxTokens 기본값 상향

```
4096 → 16384
```

`max_tokens`는 상한선일 뿐 실제 비용은 사용 토큰에만 과금. Qwen의 과도한 추론 토큰 소비에도 답변 생성 여유 확보.

### 4.4 세션 스키마 보강

- `models[].parameters.reasoningEffort` 추가
- `defaultParameters.reasoningEffort` 추가 (default: 'low')
- `messages[].reasoning` 필드 추가
- `messages[].content`: `required: true` → `default: ''`

### 4.5 세션 이력 모델 표시

```typescript
// playground.service.ts — 실제 응답한 모델만 표시
const respondedIds = new Set(
  doc.messages
    .filter((m) => m.role === 'assistant' && m.modelId)
    .map((m) => String(m.modelId)),
)
const activeModels = respondedIds.size > 0
  ? doc.models.filter((m) => respondedIds.has(String(m.modelId)))
  : doc.models
```

---

## 5. GPT-OSS 모델 확장

### 5.1 기존 모델 업데이트

| 모델 | 변경 내용 |
|------|----------|
| GPT-OSS 120B | openRouterModelId 추가, architecture: dense→moe, capabilities 보강 |
| GPT-OSS 20B | 동일 |

**주요 보정:**
- 실제 MoE 아키텍처 (120B는 5.1B active, 20B는 3.6B active)
- functionCalling, structuredOutput, toolUse, thinkingMode = true
- contextWindow: 128K → 131,072

### 5.2 신규 모델

- **GPT-OSS Safeguard 20B**: 안전성 추론 특화 모델 (content classification, LLM filtering)

### 5.3 GLM thinkingMode 보정

GLM-5, GLM-4.7, GLM-4.7-Flash: `thinkingMode: false → true`. OpenRouter에서 reasoning을 네이티브로 생성하는 모델.

---

## 6. 변경 파일 요약

| 파일 | 변경 |
|------|------|
| `src/lib/services/openrouter.service.ts` | 항상 reasoning.effort 전송, thinkingMode 로직 제거 |
| `src/app/api/playground/chat/route.ts` | reasoning 필터링 제거, 스키마 reasoningEffort 필수화 |
| `src/hooks/use-streaming-chat.ts` | reasoning→content 덤프 폴백 제거 |
| `src/components/playground/chat-column.tsx` | 스트리밍 버블 즉시 표시 |
| `src/components/playground/message-bubble.tsx` | 대기 중 커서 표시 |
| `src/components/playground/parameter-panel.tsx` | "끄기" 옵션 제거 |
| `src/lib/types/playground.ts` | reasoningEffort 필수, maxTokens 16384 |
| `src/lib/db/models/playground-session.ts` | reasoningEffort, reasoning 필드 추가 |
| `src/app/api/playground/sessions/route.ts` | 스키마 reasoningEffort 추가 |
| `src/app/api/playground/sessions/[id]/route.ts` | 메시지 reasoning 필드 추가 |
| `src/lib/services/playground.service.ts` | 세션 이력 실제 응답 모델 기준 |
| `data/models.json` | GPT-OSS 3종 업데이트, GLM thinkingMode |
| `data/model-pricing.json` | GPT-OSS Safeguard 가격 추가 |

---

## 7. 교훈

### 7.1 OpenRouter는 표준이 아니다

"reasoning 파라미터를 보내면 모든 모델이 동일하게 동작한다"는 가정이 틀렸다. 모델/프로바이더마다:
- 필수 reasoning (GPT-OSS)
- exclude 시 content null (GLM)
- 파라미터 없으면 content null (Qwen)

범용 전략 대신 **가장 안전한 공통 분모** (`effort: 'low'` 항상 전송)를 찾는 데 여러 번의 실패가 필요했다.

### 7.2 "끄기"는 의미가 없다

대부분의 추론 모델은 reasoning을 끌 수 없다 (아키텍처 내장). "끄기" 옵션은 사용자에게 잘못된 기대를 준다. 제거하고 Low/Medium/High로 단순화한 것이 올바른 판단.

### 7.3 max_tokens는 상한선이다

비용은 실제 사용 토큰에만 과금. 높은 상한선은 비용 증가가 아니라 안전 마진. 추론 모델의 토큰 소비 패턴을 고려하면 16384가 합리적.

### 7.4 API 테스트 우선

코드 변경 전에 `curl`로 실제 API 동작을 확인하는 것이 가장 효율적. 문서보다 실제 응답이 정확하다.
