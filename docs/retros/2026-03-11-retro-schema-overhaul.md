# DB Schema Overhaul 회고록

> 작성일: 2026-03-11
> 프로젝트: Atom Models - LLM 비교 및 최적화 플랫폼

---

## 1. 프로젝트 개요

DB 스키마를 전면 개편하여 9개 컬렉션 체계로 정규화하고, Provider/벤치마크/가격을 별도 컬렉션으로 분리했다. BVA 평가 차원을 4개에서 8개로 확장하고, 모델 메타데이터를 대폭 보강했다.

**핵심 목표:**
- Provider 정규화: 모델에 내장된 provider 문자열을 별도 컬렉션으로 분리
- 벤치마크/가격 이력 관리: 장기 포맷(long-format) 컬렉션으로 분리 + Model에 캐시 유지
- BVA 4차원 → 8차원 확장: reliability, toolUse, instruction, longContext 추가
- 모델 메타데이터 보강: family, variant, tags, capabilities, status, modality 등 15개 필드 추가
- Tier 단순화: 5단계(flagship/mid/small/mini/micro) → 3단계(flagship/mid/light)

---

## 2. 작업 범위

### 2.1 구현 계획

`docs/plans/2026-03-11-plan-schema-overhaul.md`에 18개 태스크, 5개 Phase로 구성된 실행 계획을 작성하고 순차 실행했다.

| Phase | 범위 | Tasks |
|-------|------|-------|
| 1. Foundation | 타입, 상수, Mongoose 모델 | Task 1-5 |
| 2. Seed Data | 데이터 파일, 시드 스크립트 | Task 6-8 |
| 3. Services | 서비스 레이어 전체 업데이트 | Task 9-13 |
| 4. API & Components | API 라우트, UI 컴포넌트 | Task 14-16 |
| 5. Tests & Verification | 테스트 업데이트, 빌드 검증 | Task 17-18 |

### 2.2 추가 작업 — Playground 버그 수정

스키마 작업 완료 후 로컬 테스트에서 발견된 Playground 버그 2건을 수정했다:

| 버그 | 원인 | 수정 |
|------|------|------|
| 응답 중복 표시 | 스트리밍 완료 후 content 상태가 잔존하여 메시지 배열과 겹침 가능 | `useStreamingChat`에서 완료 시 content/reasoning 즉시 초기화 |
| 유저 질문 이상 표시 | 메시지 버블이 `max-w-full`로 컬럼 전체 폭 차지 | 유저 메시지에 `max-w-[85%]` + `break-words` 적용 |

---

## 3. 주요 설계 결정

### 3.1 Provider 정규화 + 클라이언트 상수 전략

Provider를 별도 컬렉션으로 분리하되, 클라이언트에서 매번 Provider를 조회하는 대신 `PROVIDER_META` 상수를 도입했다.

```typescript
// src/lib/constants/providers.ts
export const PROVIDER_META: Record<string, { name: string; colorCode: string }> = {
  OPENAI:    { name: 'OpenAI',    colorCode: '#10A37F' },
  ANTHROPIC: { name: 'Anthropic', colorCode: '#D4A574' },
  // ...
}
```

- 서버 컴포넌트: `ProviderModel`로 DB 조회
- 클라이언트 컴포넌트: `PROVIDER_META[model.providerId]`로 즉시 참조
- 장점: DB 라운드트립 최소화, 8개 프로바이더로 상수 크기 부담 없음

### 3.2 벤치마크/가격 캐시 동기화

벤치마크와 가격을 별도 컬렉션으로 분리하면서, Model 문서에 캐시 필드를 유지하는 이중 저장 전략을 채택했다.

```
model_benchmarks (장기 이력) --시드 시 동기화--> models.benchmarks (최신 캐시)
model_pricing (가격 이력)   --시드 시 동기화--> models.pricing (현행 가격)
```

- 읽기 성능: 모델 조회 시 JOIN 없이 캐시 필드로 즉시 접근
- 이력 관리: 별도 컬렉션에서 시계열 데이터 관리 가능
- 동기화: 시드 스크립트의 7~8단계에서 자동 처리

### 3.3 Python 변환 스크립트

50개 모델의 데이터 변환을 `scripts/migrate-models.py`로 자동화했다.

주요 변환:
- provider 문자열 → providerId (UPPERCASE)
- tier 5→3 매핑 (small/mini/micro → light)
- 모델명에서 family/variant 추출 (정규식 기반)
- capabilities 자동 판별 (모델별 규칙 매핑)
- pricing 구조 변환 (input/output → inputPer1m/outputPer1m)
- benchmarks 맵에서 long-format 레코드 생성

### 3.4 Playground 스트리밍 상태 관리 개선

스트리밍 완료 시 hook 내부 상태를 즉시 초기화하도록 변경:

```typescript
// Before: 완료 후에도 content가 잔존
setState({ isStreaming: false, content: fullContent, ... })

// After: content는 반환 객체에만 존재, 상태는 초기화
setState({ isStreaming: false, content: '', reasoning: '', metrics: null, error: null })
return { role: 'assistant', content: fullContent, ... }
```

최종 응답 데이터는 반환값을 통해 `messages` 배열에만 저장되므로, 스트리밍 overlay와 메시지 목록 간 중복 가능성을 원천 차단.

---

## 4. 결과 요약

### 4.1 산출물

| 구분 | 내용 |
|------|------|
| 변경 파일 | 74개 (수정 57 + 신규 17) |
| 코드 변경 | +4,181 / -1,887 |
| 데이터 변경 | models.json 전면 재작성 (+2,437 / -611) |
| 테스트 | 42 suites, 247 tests 전체 통과 |
| TypeScript 오류 | 0 (61건 발견 → 전부 수정) |

### 4.2 컬렉션 체계 변경

| 컬렉션 | 상태 | 레코드 수 |
|--------|------|----------|
| providers | 신규 | 8 |
| models | 수정 (15개 필드 추가) | 50 |
| model_benchmarks | 신규 | 150 |
| model_pricing | 신규 | 50 |
| ref_benchmarks | 신규 (benchmark_meta 대체) | 11 |
| ref_gpus | 리네이밍 (gpu_reference → ref_gpus) | 11 |
| bva_dimensions | 확장 (4→8) | 8 |
| bva_presets | 리네이밍 (industry_presets → bva_presets) | 12 |
| playground_sessions | 유지 | - |

### 4.3 삭제된 항목

| 항목 | 사유 |
|------|------|
| `src/lib/db/models/benchmark-meta.ts` | RefBenchmark으로 대체 |
| `src/lib/db/models/price-history.ts` | ModelPricing으로 대체 |
| `IModel.languageScores` | 미사용 필드, 벤치마크 기반으로 대체 |
| `IModel.colorCode` | Provider 컬렉션으로 이동 |
| Tier `small`, `mini`, `micro` | `light`로 통합 |

---

## 5. 발견 및 해결한 문제

### 5.1 빌드 오류 (61건)

Phase 1~3 완료 후 `tsc --noEmit`에서 61건의 타입 오류가 발생했다. build-error-resolver 에이전트를 병렬 투입하여 해결:

| 카테고리 | 건수 | 주요 원인 |
|----------|------|-----------|
| 필드명 변경 | 28 | `pricing.input` → `pricing.inputPer1m` 등 |
| Import 경로 변경 | 15 | 삭제/리네이밍된 모듈 참조 |
| 타입 변경 | 12 | `IndustryPresetDocument` → `BvaPresetDocument` 등 |
| 테스트 Mock 불일치 | 6 | 새 필수 필드 누락, 가중치 키 불일치 |

### 5.2 데이터 변환 이슈

| 문제 | 해결 |
|------|------|
| 32개 모델 family 미매핑 | migrate-models.py에 정규식 규칙 50개 모델 전체 커버 |
| Mongoose 중복 인덱스 경고 | `index: true`와 `schema.index()` 중복 정의 — 기능에 영향 없으나 정리 필요 |
| 로컬 서버 데이터 없음 | 로컬 MongoDB에 시드 미실행 → `--force` 모드로 시드 완료 |

### 5.3 Playground 버그 (2건)

스키마 오버홀 이후 로컬 테스트에서 발견:
- **응답 중복**: `useStreamingChat`의 content 상태 잔존으로 인한 이중 표시 가능성
- **질문 표시 이상**: 메시지 버블이 전체 폭 차지하여 챗 UI 느낌 부재

---

## 6. 잘된 점

1. **계획 우선 접근**: 18개 태스크로 구조화된 계획을 먼저 작성하여, 방대한 스키마 변경을 체계적으로 진행했다.
2. **캐시 동기화 전략**: 정규화와 읽기 성능을 동시에 확보하는 이중 저장 패턴이 효과적이었다.
3. **Python 변환 스크립트**: 50개 모델 데이터를 수작업 대신 자동화하여 일관성을 확보했다.
4. **병렬 에이전트 투입**: 빌드 오류 61건을 병렬 build-error-resolver로 신속하게 해결했다.
5. **즉각적 버그 수정**: 로컬 테스트에서 발견된 Playground 버그를 즉시 수정하여 품질을 유지했다.

---

## 7. 개선할 점

1. **단일 커밋에 너무 많은 변경**: 74개 파일 변경이 한 커밋에 포함된다. Phase별로 중간 커밋을 했으면 리뷰와 롤백이 용이했을 것이다.
2. **Mongoose 중복 인덱스 경고**: model.ts에서 `index: true`와 `schema.index()` 중복 정의가 있다. 빌드에는 영향 없지만 정리가 필요하다.
3. **구 데이터 파일 미정리**: `benchmark-meta.json`, `price-history.json`, `industry-presets.json`이 아직 data/ 디렉토리에 남아있다. 시드 스크립트에서는 사용하지 않지만 혼란을 줄 수 있다.
4. **신규 벤치마크 데이터 부족**: 4개 신규 벤치마크(truthfulqa, bfcl, ifeval, ruler)의 실제 점수가 대부분 null이다. 데이터 보강이 필요하다.
5. **E2E 테스트 미실행**: 단위/통합 테스트만 실행하고 E2E 테스트는 수행하지 않았다. 전체 페이지 동작 검증이 부족하다.

---

## 8. 후속 작업

| 우선순위 | 작업 | 비고 |
|----------|------|------|
| 높음 | 신규 벤치마크 4종 데이터 보강 | truthfulqa, bfcl, ifeval, ruler 점수 수집 |
| 높음 | 구 데이터 파일 정리 | benchmark-meta.json, price-history.json 삭제 |
| 높음 | Railway DB 시드 | 프로덕션 DB에 신규 스키마 데이터 반영 |
| 중간 | Mongoose 중복 인덱스 정리 | model.ts의 `index: true` / `schema.index()` 중복 해소 |
| 중간 | BVA 8차원 UI 반영 | 레이더 차트, 가중치 슬라이더 8차원 대응 |
| 낮음 | E2E 테스트 추가 | 스키마 변경 후 전체 페이지 플로우 검증 |

---

## 9. 산출 문서 목록

| 문서 | 경로 |
|------|------|
| 스키마 오버홀 실행 계획 | docs/plans/2026-03-11-plan-schema-overhaul.md |
| 신규 DB 스키마 설계 | docs/schemas/2026-03-11-schema-db-new.md |
| 모델 데이터 변환 스크립트 | scripts/migrate-models.py |
| 본 회고록 | docs/retros/2026-03-11-retro-schema-overhaul.md |
