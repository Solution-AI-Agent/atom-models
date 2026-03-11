# Playground - 모델 비교 플레이그라운드 설계

## 개요

모델별 메시지 발송/수신 결과를 육안으로 비교할 수 있는 비교 플레이그라운드.
OpenRouter 단일 게이트웨이를 통해 최대 3개 모델에 동일 프롬프트를 보내고,
독립적으로 스트리밍되는 응답을 나란히 비교한다.

## 핵심 요구사항

- OpenRouter API 통합 (서버 환경변수로 API 키 관리)
- 최대 3개 모델 동시 비교
- 각 모델 독립적 스트리밍 (병렬 비동기)
- 측정 지표: TTFT, 총 응답시간, TPS, 입출력 토큰 수, 예상 비용
- 멀티턴 채팅 (단일 입력 → 응답 후 이어서 대화)
- 공통 시스템 프롬프트 1개
- 모델별 파라미터 개별 설정 가능 (기본값은 공통)
- 세션 DB 저장 & 재열람
- 데스크탑: 1~3컬럼 나란히 / 모바일: 세로 스택

## 페이지 구조 & 라우팅

- 사이드바에 "플레이그라운드" 메뉴 추가
- `/playground` — 단일 페이지 (세션 관리 + 채팅)

### 페이지 내 레이아웃

- PlaygroundHeader: 세션 드롭다운 + 새 세션 + 세션 목록 Sheet 트리거
- PlaygroundSetup (접기 가능): 모델 선택, 시스템 프롬프트, 기본 파라미터
- ChatArea: 선택된 모델 수에 따라 1~3컬럼 동적 생성
- ChatInput: 하단 고정, 공통 메시지 입력

## 데이터 모델

### Model 스키마 확장

- `openRouterModelId` (string, optional) 추가
- 이 필드가 없는 모델은 플레이그라운드에서 선택 불가

### PlaygroundSession 컬렉션 (신규)

```
{
  title: string
  models: [
    {
      modelId: ObjectId       // Model ref
      parameters: {
        temperature?: number
        maxTokens?: number
        topP?: number
      }
    }
  ]
  systemPrompt: string
  messages: [
    {
      role: 'user' | 'assistant'
      content: string
      modelId?: ObjectId      // assistant일 때만
      metrics?: {
        ttft: number          // ms
        totalTime: number     // ms
        tps: number
        inputTokens: number
        outputTokens: number
        estimatedCost: number
      }
    }
  ]
  defaultParameters: {
    temperature: number
    maxTokens: number
    topP: number
  }
  createdAt: Date
  updatedAt: Date
}
```

## API 설계

| Method | Path | 용도 |
|--------|------|------|
| GET | `/api/playground/sessions` | 세션 목록 조회 |
| GET | `/api/playground/sessions/[id]` | 세션 상세 조회 |
| POST | `/api/playground/sessions` | 새 세션 생성 |
| DELETE | `/api/playground/sessions/[id]` | 세션 삭제 |
| POST | `/api/playground/chat` | 메시지 발송 (스트리밍) |

### 스트리밍 방식

- 클라이언트에서 모델별 개별 fetch 3개 동시 발송
- 서버: OpenRouter API를 `stream: true`로 호출, ReadableStream으로 SSE 중계
- 각 스트림 독립적 (하나가 느려도 나머지 영향 없음)

### 시간 측정

- 클라이언트에서 `performance.now()` 기준
  - TTFT: fetch 시작 → 첫 토큰 수신
  - 총 응답 시간: fetch 시작 → 스트림 완료
  - TPS: 총 토큰 수 / 총 응답 시간(초)

### 비용 계산

- OpenRouter 응답의 usage 정보 + DB 모델 가격 정보
- `(inputTokens * pricing.input + outputTokens * pricing.output) / 1,000,000`

### 세션 저장 타이밍

- 모든 모델 스트림 완료 후 클라이언트에서 PATCH로 메시지 + metrics 일괄 저장

## 프론트엔드 컴포넌트

```
/playground (page)
├── PlaygroundHeader
│   ├── SessionDropdown
│   └── SessionListSheet
│       └── SessionCard
├── PlaygroundSetup (접기 가능)
│   ├── ModelSelector (1~3개, openRouterModelId 있는 모델만)
│   ├── SystemPromptInput
│   └── DefaultParameterPanel (temperature, maxTokens, topP)
├── ChatArea (1~3컬럼, 모바일: 세로 스택)
│   └── ChatColumn (x1~3)
│       ├── ColumnHeader (모델명 + 파라미터 오버라이드)
│       ├── MessageList
│       │   └── MessageBubble (스트리밍 타이핑 효과)
│       └── MetricsBar (턴별 인라인)
└── ChatInput (하단 고정)
```

## 엣지 케이스 & UX

- 1개 모델 실패 → 해당 컬럼만 에러, 나머지 정상
- API 키 미설정 → 안내 메시지
- 스트리밍 중 네트워크 끊김 → 에러 + 재시도 버튼
- 이전 턴 모든 응답 완료 전 다음 메시지 전송 불가
- 세션 진행 중 모델 변경 불가 (새 세션 생성 필요)
- 스트리밍 중 개별 중단(stop) 버튼 제공
- 세션 제목: 첫 메시지 기반 자동 생성, 수정 가능
- MetricsBar: `TTFT 320ms | 총 2.1s | 45.2 tps | 512 tokens | $0.0023`
- 가장 빠른 모델의 지표에 하이라이트
