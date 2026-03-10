# 회고: 모델 테이블 개선 스프린트 (2026-03-10)

## 작업 범위

GitHub 이슈 3건을 통합 처리하여 모델 탐색/인프라 가이드 테이블의 정보성과 사용성을 개선.

| 이슈 | 제목 | 핵심 |
|------|------|------|
| #1 | Modify Model Score | 평가 점수 → 벤치마크 컬럼 교체 |
| #2 | 인프라 가이드 기능 개선 | 양자화 확장 + TPS 공식 표시 |
| #3 | 테이블에 정렬기능 추가 | 컬럼별 정렬 UI |

## 팀 구성 및 워크플로우

4단계 파이프라인으로 전문 에이전트를 배치했다:

```
planner → DBA → Backend + Frontend (병렬) → code-reviewer + build-error-resolver
```

| Phase | 에이전트 | 역할 | 소요 |
|-------|----------|------|------|
| 1 | planner | 통합 구현 계획 수립, 22개 태스크 정의 | ~3분 |
| 2 | DBA (tdd-guide) | 스키마/타입/시드 변경 (선행) | ~5분 |
| 3A | Backend (tdd-guide) | 서비스 로직 확장 | ~4분 (병렬) |
| 3B | Frontend (tdd-guide) | 컴포넌트/UI 변경 | ~8분 (병렬) |
| 4 | code-reviewer + build-error-resolver + security-reviewer | 검증 | ~3분 |

## 주요 변경사항

### 1. 모델 탐색 테이블: 벤치마크 컬럼 (#1 + #3)

| 항목 | Before | After |
|------|--------|-------|
| 평가 컬럼 | quality/speed ScoreBadge | 제거 |
| 벤치마크 | 상세 페이지에서만 확인 | MMLU, GPQA, SWE-bench, AIME, HLE, MGSM 6개 컬럼 |
| 정렬 | URL 파라미터 수동 입력만 가능 | SortableHeader 클릭으로 정렬 |
| 컬럼 커스터마이저 | type, scores, context | type, 벤치마크 6개, context |

### 2. 인프라 가이드 개선 (#2 + #3)

| 항목 | Before | After |
|------|--------|-------|
| 양자화 레벨 | FP16, INT8, INT4 (3종) | FP16, FP8, INT8, INT4, Q6_K, Q5_K, Q4_K_M, Q3_K, Q2_K (9종) |
| 양자화 분류 | 없음 | Standard (4종) / GGUF (5종) 그룹 |
| TPS 공식 | 미노출 | TpsFormulaInfo 컴포넌트로 공식 표시 |
| 호환 모델 정렬 | TPS 1개 컬럼만 토글 | 모델명, 파라미터, VRAM, TPS 다중 정렬 |

### 3. 공유 컴포넌트 추출

`SortableHeader` 를 `gpu-table.tsx`에서 추출하여 3개 테이블(GPU, 모델 탐색, 호환 모델)에서 재사용.

### 4. 보안 강화

- `model.service.ts`에 `ALLOWED_SORT_FIELDS` allowlist 추가 (NoSQL sort injection 방지)
- `column-customizer.tsx`의 `ColumnKey` 타입을 명시적 유니온으로 정의 (타입 안전성)

## 신규/수정 파일

### 신규 (9개)
- `src/components/shared/sortable-header.tsx` — 공유 정렬 헤더
- `src/components/infra/tps-formula-info.tsx` — TPS 공식 표시
- `src/lib/constants/quantizations.ts` — 양자화 레벨 상수
- `src/__tests__/components/shared/sortable-header.test.tsx`
- `src/__tests__/components/infra/tps-formula-info.test.tsx`
- `src/__tests__/components/explore/column-customizer.test.tsx`
- `src/__tests__/components/explore/explore-client.test.tsx`
- `src/__tests__/lib/constants/quantizations.test.ts`
- `src/__tests__/lib/types/gpu.test.ts`

### 수정 (18개)
- 타입: `gpu.ts`, `model.ts`
- 스키마: `db/models/model.ts`
- 서비스: `gpu.service.ts`, `model.service.ts`
- 컴포넌트: `model-table.tsx`, `model-table-row.tsx`, `explore-client.tsx`, `column-customizer.tsx`, `gpu-table.tsx`, `compatible-models-table.tsx`
- 데이터: `data/models.json` (49개 OSS 모델에 6개 VRAM 필드 추가)
- 테스트: 5개 기존 테스트 파일 확장

## 정량 지표

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 테스트 수 | 136 | 201 | +65 |
| 테스트 스위트 | 30 | 37 | +7 |
| 양자화 레벨 | 3종 | 9종 | +6 |
| 변경/추가 파일 | - | 27개 | - |
| 코드 변경량 | - | +1,444 / -110 lines | - |

## TDD 적용 결과

16개 RED-GREEN-REFACTOR 사이클을 실행했다:
- Phase 2 (DBA): 5 사이클 → 16개 신규 테스트
- Phase 3A (Backend): 3 사이클 → 11개 신규 테스트
- Phase 3B (Frontend): 8 사이클 → 38개 신규 테스트

모든 테스트는 구현 전 작성(RED) → 실패 확인 → 최소 구현(GREEN) 순서를 따랐다.

## 코드 리뷰 / 보안 리뷰 결과

### 코드 리뷰
- CRITICAL: 0 / HIGH: 2 (수정 완료) / MEDIUM: 4 / LOW: 3

### 보안 리뷰
- CRITICAL: 0 / HIGH: 0 / MEDIUM: 3 (기존 코드, #4 이슈로 등록)
- npm audit: 0 vulnerabilities

## 커밋 이력

```
207d42d feat: 모델 벤치마크 컬럼, 테이블 정렬, 인프라 양자화 확장 (#1, #2, #3)
```

## 잘된 점

- **이슈 통합 분석**: 3개 이슈의 영향 범위를 사전 분석하여 충돌 없이 통합 작업. 특히 #1(컬럼 교체)과 #3(정렬 추가)을 분리했다면 이중 작업이 발생했을 것.
- **DBA 선행 패턴**: 타입/스키마를 먼저 확정하여 Backend/Frontend가 같은 계약 기반으로 병렬 작업 가능. 파일 충돌 0건.
- **SortableHeader 재사용**: GPU 테이블의 인라인 컴포넌트를 추출하여 3곳에서 재사용. 코드 중복 제거와 일관된 UX 확보.
- **보안 선제 대응**: 코드 리뷰에서 sort injection 리스크를 발견하고 allowlist로 즉시 수정.
- **QUANTIZATION_LEVELS 상수 설계**: key/label/description/group 구조로 서비스와 UI 양쪽에서 단일 소스로 활용.

## 개선할 점

- **extractGpuName 파싱 불일치**: `minGpu` 값("1x A100 80GB")과 GPU 레퍼런스 이름("NVIDIA A100 80GB SXM")이 불일치하여 `tpsFormula`가 대부분 null 반환. 별도 수정 필요.
- **MoE 모델 GGUF VRAM 설명 부재**: activeParameters 기반 계산 결과가 FP16 대비 극단적으로 낮아(97.5% 감소) 사용자 혼란 가능. UI에 설명 추가 필요.
- **sort 비교 로직 중복**: `gpu-table.tsx`와 `compatible-models-table.tsx`의 클라이언트 정렬 로직이 동일. 공유 유틸로 추출 권장.
- **테이블 가로 오버플로우 미검증**: 벤치마크 6컬럼 추가 후 좁은 화면에서의 레이아웃을 실제 브라우저에서 미확인. 수동 QA 필요.

## 남은 작업

- [#4 API 파라미터 검증 강화](https://github.com/Solution-AI-Agent/atom-models/issues/4) — limit 클램핑, type/tier 검증, benchmarks 스키마 타입 수정
- extractGpuName 파싱 로직 개선
- MoE 모델 GGUF VRAM 안내 문구 추가
- 클라이언트 sort 유틸 추출
- 모바일 레이아웃 QA
