# 회고: 인프라 가이드 GPU 상세 페이지 추가 (2026-03-09)

## 작업 범위

인프라 가이드 목록에서 GPU 이름 클릭 시 상세 페이지로 이동하여 가격 정보, 하드웨어 사양, 해당 GPU에서 배포 가능한 OSS 모델 목록과 예상 성능을 확인할 수 있도록 개선.

## 주요 변경사항

### 1. GPU 슬러그 체계 도입

| 항목 | 변경 내용 |
|------|-----------|
| `gpu.ts` (타입) | `slug` 필드 추가 |
| `gpu-reference.ts` (스키마) | `slug` (required, unique) 추가 |
| `gpu-reference.json` (시드) | 11개 GPU에 슬러그 값 추가 (e.g. `nvidia-h100-80gb-sxm`) |
| `gpu.service.ts` | `getGpuBySlug(slug)` 함수 추가 |

### 2. 호환 모델 조회 서비스

`gpu.service.ts`에 `getCompatibleModels(gpuVram, gpuFp16Tflops)` 함수 추가.
- OSS 모델 49개 대상으로 GPU VRAM 기준 호환성 3단계 판별 (FP16 > INT8 > INT4)
- 참조 GPU fp16Tflops 비율 기반 TPS 스케일링 (DB 조회로 매핑, 실패 시 원본 값 fallback)
- `ICompatibleModel`, `QuantizationLevel` 타입 신규 정의

### 3. GPU 상세 페이지 (`/infra/[slug]`)

| 컴포넌트 | 역할 |
|----------|------|
| `gpu-detail-header.tsx` | GPU 이름(h1), 벤더, 카테고리 한글 배지, 뒤로가기 링크, 노트 |
| `gpu-pricing-card.tsx` | MSRP, 클라우드 시간당/월/연 추정 비용 (2x2 그리드) |
| `gpu-specs-card.tsx` | VRAM, 메모리 타입, FP16 TFLOPS, INT8 TOPS, TDP |
| `compatible-models-table.tsx` | 호환 모델 테이블 (양자화 필터, TPS 정렬, 반응형, 빈 상태 처리) |

### 4. 목록 → 상세 연결

- `gpu-table.tsx`: 데스크탑 테이블 GPU 이름에 `Link` 추가
- `gpu-card.tsx`: 모바일 카드 GPU 이름에 `Link` 추가
- `infra/page.tsx`: serialized 데이터에 `slug` 필드 포함

## 파일 변경 요약

| 구분 | 파일 | 변경 |
|------|------|------|
| 신규 | `src/app/infra/[slug]/page.tsx` | 상세 페이지 라우트 |
| 신규 | `src/components/infra/gpu-detail-header.tsx` | 헤더 컴포넌트 |
| 신규 | `src/components/infra/gpu-pricing-card.tsx` | 가격 카드 |
| 신규 | `src/components/infra/gpu-specs-card.tsx` | 스펙 카드 |
| 신규 | `src/components/infra/compatible-models-table.tsx` | 호환 모델 테이블 |
| 신규 | `src/__tests__/components/infra/compatible-models-table.test.tsx` | 테이블 컴포넌트 테스트 |
| 수정 | `src/lib/types/gpu.ts` | `slug`, `QuantizationLevel`, `ICompatibleModel` 추가 |
| 수정 | `src/lib/db/models/gpu-reference.ts` | 스키마 slug 필드 |
| 수정 | `src/lib/services/gpu.service.ts` | `getGpuBySlug`, `getCompatibleModels` 함수 |
| 수정 | `data/gpu-reference.json` | 11개 GPU slug 추가 |
| 수정 | `src/components/infra/gpu-table.tsx` | GPU 이름에 Link |
| 수정 | `src/components/infra/gpu-card.tsx` | GPU 이름에 Link |
| 수정 | `src/app/infra/page.tsx` | slug 필드 포함 |
| 수정 | `src/__tests__/lib/services/gpu.service.test.ts` | 서비스 테스트 확장 |
| 수정 | `src/__tests__/components/infra/gpu-table.test.tsx` | slug 필드 반영 |

## 팀 구성 및 작업 분배

3명 팀 (team-lead, backend-dev, frontend-dev)으로 병렬 작업 수행.

| 멤버 | 담당 | 소요 |
|------|------|------|
| backend-dev | Phase 1 (슬러그) + Phase 2 (호환 서비스) + Phase 6 일부 (서비스 테스트) | 순차 실행 |
| frontend-dev | Phase 4 (UI 컴포넌트 4개) + Phase 6 일부 (컴포넌트 테스트) | 병렬 실행 |
| team-lead | Phase 3 (페이지 라우트) + Phase 5 (Link 연결) | 의존성 해소 후 실행 |

## 테스트 현황

- 31 suites, 136 tests 전부 통과
- 신규 테스트 21개: 서비스 10개 (`getGpuBySlug`, `getCompatibleModels`) + 컴포넌트 11개 (`CompatibleModelsTable`)

## 잘된 점

- **병렬 작업 효율**: backend-dev와 frontend-dev가 독립적으로 Phase 1+2와 Phase 4를 동시 진행하여 대기 시간 최소화. 타입 정의(`ICompatibleModel`)를 양쪽에서 동일하게 참조하도록 사전 합의.
- **TPS 스케일링 설계**: `minGpu` 문자열에서 참조 GPU를 DB 조회하여 fp16Tflops 비율로 자동 스케일링. 매핑 실패 시 원본 값 fallback으로 안정성 확보.
- **기존 패턴 활용**: 모델 상세 페이지(`/explore/[slug]`)의 구조(generateMetadata, notFound, 컴포넌트 조합)를 그대로 따라 일관성 유지.

## 개선할 점

- **TPS 추정 정확도**: 단순 TFLOPS 비율 스케일링은 메모리 대역폭, 양자화 오버헤드 등을 반영하지 못함. 실측 벤치마크 데이터가 축적되면 보정 계수 적용 필요.
- **멀티 GPU 모델 표시**: 671B급 모델(DeepSeek V3/R1)의 `minGpu`가 "8x A100 80GB"이지만 현재 단일 GPU 기준으로만 비교하므로 이런 모델은 대부분 호환 불가로 분류됨. 멀티 GPU 구성 지원 고려.
- **frontend-dev idle 이슈**: Task #6 할당 후 frontend-dev가 idle 상태로 대기하여 backend-dev에게 재할당. 메시지 수신 타이밍과 태스크 전달 프로토콜 개선 필요.
