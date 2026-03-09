# 회고: 산업별 추천 화면 개선 및 데이터 정비 (2026-03-09)

## 작업 범위

산업별 추천 상세 화면의 적합도 랭킹을 상용/OSS로 분리하고, OSS 모델 데이터를 전면 정비하여 다양한 프로바이더의 모델이 랭킹에 노출되도록 개선.

## 주요 변경사항

### 1. UI 개선: 상용/OSS 랭킹 분리

| 컴포넌트 | 변경 내용 |
|----------|-----------|
| `preset-card.tsx` | 단일 랭킹 → 상용(blue) / OSS(green) 분리 표시 |
| `fitness-score-bar.tsx` | `barColorClass` prop 추가로 색상 커스터마이징 |
| `oss-fitness-ranking.tsx` | 신규 — 인프라 배지(파라미터, 아키텍처, GPU, VRAM, 라이선스) 포함 |
| `preset.ts` (타입) | `IRankedModelInfra`, `IRankedModel.type/infra` 필드 추가 |

### 2. 랭킹 다양성 확보

`recommendation.service.ts`에 `diversify()` 함수 추가.
- 프로바이더당 최대 2개 모델 제한
- 상용/OSS 각각 독립 적용
- 결과: 모든 프리셋에서 최소 3개 이상 프로바이더 노출 (기존 2개 → 3~4개)

### 3. 데이터 정비

| 항목 | Before | After |
|------|--------|-------|
| 총 모델 수 | 64 → 97 | 87 (정리 후) |
| OSS 모델 | 26 | 49 |
| 프로바이더 | 10 (하드코딩) | 21 (전수 등록) |
| 프리셋 참조 무결성 | 10건 깨짐 | 0건 |

**추가된 프로바이더 (11개):**
Zhipu AI, Moonshot AI, 01.AI, Microsoft, NVIDIA, LG AI Research, Upstage, IBM, TII, AI21, Allen AI, Shanghai AI Lab

**제거된 모델 (10개):**
- Llama 5개 (Meta) — 벤치마크 대비 실사용 선호도 괴리
- 구세대 5개 — Mixtral 8x22B, Yi-1.5 34B/9B, ChatGLM3 6B, Qwen 2.5 72B

**스코어 재조정 (5개):**
GLM-4.7, GLM-5, GLM-4.5, Kimi-Dev 72B, DeepSeek V3.2 — 검증된 벤치마크 기반 재조정으로 코딩/에이전트 프리셋 상위 5 진입

### 4. 프로바이더 필터 수정

`src/lib/constants/providers.ts`: 10개 → 21개 전체 프로바이더 등록. 삭제된 `Meta` 제거.

## 커밋 이력

```
2a08213 fix: 제공사 필터 목록 전체 프로바이더 21개로 확장
8c12bef fix: 프리셋 추천 Llama 참조 무결성 복구
811370d feat: 산업별 추천 OSS 랭킹 다양성 개선 및 데이터 정비
4d059ea feat: 최신 LLM 모델 15종 추가 및 시드 데이터/문서 정비
```

## 배포

- Railway 배포 완료 (`railway up --detach`)
- Railway MongoDB 시드 완료 (공개 URL `ballast.proxy.rlwy.net:35663` 사용)
- orphan 레코드 7건 정리 (Llama 5 + Mixtral + Qwen 3.5 72B)

## 잘된 점

- **프로바이더 다양성 로직**: `diversify()` 함수 하나로 깔끔하게 해결. 데이터를 유지하면서 랭킹만 다양화.
- **데이터 무결성 점검**: 프리셋 추천 → 모델 slug 참조 관계를 스크립트로 전수 검증하여 깨진 참조 10건 발견/수정.
- **체계적 프로바이더 전수 조사**: 웹 검색 기반으로 Alibaba, Zhipu AI, Moonshot AI 등의 최신 모델 라인업을 검증하여 반영.

## 개선할 점

- **Llama 제거 시 연쇄 영향 미확인**: 모델 삭제 후 프리셋 참조가 깨지는 것을 즉시 감지하지 못함. 향후 모델 삭제 시 참조 무결성 자동 검증 스크립트 필요.
- **시드 스크립트 한계**: upsert 모드만 지원하여 삭제된 모델이 DB에 잔존. 시드 시 "JSON에 없는 DB 레코드 자동 삭제" 옵션 추가 고려.
- **벤치마크 데이터 불균일**: 기본 6종(mmlu, gpqa, swe_bench, aime, hle, mgsm)이 13개 모델에서 부분 누락. 공식 데이터 미공개 모델이 대부분이나, 장기적으로 통일된 벤치마크 셋 관리 필요.
- **프로바이더 필터 UI**: 21개 버튼이 한 줄에 나열되면 과밀. 접기/검색 UI로 개선 고려.

## 테스트 현황

- 30 suites, 116 tests 전부 통과
- 신규 테스트: `diversify` 로직 검증 (프로바이더 제한, 멀티 프로바이더 포함)
