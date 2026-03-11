# BVA (Business Value Assessment) 기능 설계

## 개요

기존 산업별 추천 시스템을 확장하여, 고객 맥락 기반의 비즈니스 가치 평가(BVA) 기능을 추가한다.
자체 점수(scores)를 제거하고 공신력 있는 벤치마크 기반의 투명한 평가 체계로 전환한다.

## 사용자

- Atom 내부 컨설턴트 (고객 미팅에서 활용)
- 고객사 담당자 (셀프서비스)

## 기존 시스템과의 관계

기존 프리셋 기반 추천 흐름 위에 BVA 입력 단계를 추가하는 확장 방식.
"프리셋 선택 -> 고객 정보 입력 -> BVA 결과" 흐름.

---

## 1. 고객 프로필 입력 (구조화된 선택지)

| 항목 | 입력 방식 | 선택지 |
|------|----------|--------|
| 업종 | 드롭다운 | 기존 12개 프리셋 카테고리 활용 |
| 상담 유형 | 멀티셀렉트 | 고객응대, 내부지식관리, 코드리뷰 등 |
| 월간 볼륨 | 구간 선택 | 1만 이하 / 1~10만 / 10~100만 / 100만+ |
| 언어 | 체크박스 | 한국어, 영어, 일본어, 중국어 |
| 톤앤매너 | 라디오 | 격식체 / 반말 / 전문용어 중심 |
| 보안 요구사항 | 체크박스 | 온프레미스 필수 / 개인정보 처리 / 규제 산업 |

---

## 2. 평가 체계 전환: 자체 scores -> 벤치마크 기반

### 제거 대상

`scores: { quality, speed, reasoning, coding, multimodal }` 전면 제거.
자체적으로 매긴 점수는 고객에게 설명 불가하므로 사용하지 않는다.

### 벤치마크 구성 (확정)

리서치 결과 데이터 가용성을 반영하여 최종 확정:

| 기존 (유지) | 신규 추가 | 제외 (데이터 부재) |
|------------|----------|------------------|
| MMLU | KMMLU (한국어 지식) | KoBEST (상용 모델 데이터 없음) |
| GPQA | | TruthfulQA (프로바이더 미보고) |
| SWE-bench | | HaluEval (학술용, 실용 데이터 부족) |
| AIME | | |
| HLE | | |
| MGSM | | |

총 7개 벤치마크: MMLU, GPQA, SWE-bench, AIME, HLE, MGSM, KMMLU

### 보안/컴플라이언스: 태그 방식

정량화 불가 항목은 점수가 아닌 조건 충족 여부로 관리:
- SOC2 인증
- HIPAA 대응
- GDPR 준수
- 온프레미스 배포 가능
- 데이터 학습 제외 옵션

---

## 3. BVA 평가 차원 (확정: 4차원 + cost)

리서치 결과를 반영하여 reliability 차원은 1차에서 제외.
신뢰할 수 있는 환각 벤치마크가 확보되면 추후 추가.

| 차원 | displayName | 공식 | 설명 |
|------|-----------|------|------|
| reasoning | 종합 추론력 | GPQA(40%) + AIME(30%) + HLE(30%) | 복잡한 문제를 단계적으로 분석하고 해결하는 능력 |
| korean | 한국어 능력 | KMMLU(70%) + MGSM(30%) | 한국어 이해, 생성, 지식 범위 종합 평가 |
| coding | 코딩 능력 | SWE-bench(100%) | 코드 생성, 디버깅, 실제 SW 엔지니어링 문제 해결 |
| knowledge | 지식 범위 | MMLU(70%) + GPQA(30%) | 다양한 분야의 사실적 지식과 학문적 이해력 |
| cost | 비용 효율 | pricing 기반 (기존 로직 유지) | 상용: max(0, 100-(output/60)*100), OSS: 100 |

### null 벤치마크 처리

모델에 특정 벤치마크 데이터가 없을 경우, 해당 차원 내 가용 벤치마크로 가중치를 재정규화.
예: korean 차원에서 KMMLU만 있으면 KMMLU 100%로 계산.

### IPresetWeights (확정)

```typescript
interface IPresetWeights {
  readonly reasoning: number       // BvaDimension "reasoning"
  readonly korean: number          // BvaDimension "korean"
  readonly coding: number          // BvaDimension "coding"
  readonly knowledge: number       // BvaDimension "knowledge"
  readonly cost: number            // pricing 기반
}
```

기존 quality/speed/multimodal 제거. 5개 가중치 합 = 1.0.

---

## 4. 데이터 모델 변경

### Model 스키마

```
// 제거
scores: { quality, speed, reasoning, coding, multimodal }

// benchmarks Map 확장
benchmarks: {
  mmlu, gpqa, swe_bench, aime, hle, mgsm,  // 기존
  kmmlu,                                     // 신규 (1개)
}

// 신규 필드
compliance: {
  soc2: boolean,
  hipaa: boolean,
  gdpr: boolean,
  onPremise: boolean,
  dataExclusion: boolean,
}
```

### 신규 컬렉션: BenchmarkMeta

벤치마크별 고객 설명용 메타데이터:

```
{
  key: "mmlu",
  name: "MMLU",
  displayName: "대학 수준 지식 이해력",
  description: "수학, 역사, 법률 등 57개 분야의 객관식 문제로 모델의 지식 범위를 측정",
  source: "UC Berkeley",
  scoreRange: { min: 0, max: 100 },
  interpretation: "90+ 전문가 수준, 80+ 우수, 70+ 양호",
}
```

### 신규 컬렉션: BvaDimension

벤치마크 -> BVA 평가 차원 매핑 (투명한 계산식):

```
{
  key: "reasoning",
  displayName: "종합 추론력",
  description: "복잡한 문제를 단계적으로 분석하고 해결하는 능력",
  formula: [
    { benchmark: "gpqa", weight: 0.4 },
    { benchmark: "aime", weight: 0.3 },
    { benchmark: "hle", weight: 0.3 },
  ],
  formulaExplanation: "대학원 수준 과학(GPQA 40%) + 수학 경시대회(AIME 30%) + 최고 난이도 추론(HLE 30%)",
}
```

---

## 5. BVA 결과 화면: 비교 리포트

### 리포트 구성

1. **고객 프로필 요약** - 입력한 업종, 상담 유형, 볼륨, 보안 요건
2. **추천 모델 Top 2~3** - 상용/OSS 구분 추천
3. **차원별 비교표** - 벤치마크 기반 점수 + 고객 친화적 설명
   - 각 벤치마크명 옆 (?) 툴팁으로 설명
   - "한국어 자연스러움: KMMLU 기준 Claude 92점 vs GPT-4o 85점"
4. **비용 시뮬레이션** - 월간 볼륨 기반 예상 월비용
   - 상용: 토큰 단가 x 예상 사용량
   - OSS: GPU 인프라 비용 (기존 GPU 레퍼런스 연동)
5. **보안/컴플라이언스 체크리스트** - 요구사항 충족 여부 O/X
6. **최종 추천 사유** - "귀사의 금융 상담 업무에는 A 모델을 추천합니다. 이유: ..."

### 차원 설명 UI (확정)

BVA 평가 방법론의 투명성을 위해 두 곳에서 설명을 제공:

1. **리포트 내 인라인 툴팁** - 각 차원/벤치마크 점수 옆 (?) 아이콘
   - 클릭 시 간략한 설명 (벤치마크 이름, 출처, 점수 해석)
   - 컨설턴트가 고객에게 즉시 설명 가능

2. **독립 방법론 페이지** (`/methodology`)
   - 전체 BVA 평가 체계 상세 설명
   - 각 차원의 벤치마크 구성, 가중치 공식, 계산 방법
   - 각 벤치마크의 출처, 측정 방식, 점수 해석 가이드
   - 리포트에서 "평가 방법론 상세보기" 링크로 연결

---

## 6. 변경 영향도

### 핵심 로직 (4파일)

| 파일 | 변경 내용 |
|------|----------|
| `lib/types/model.ts` | IModelScores 제거, compliance 타입 추가 |
| `lib/types/preset.ts` | IPresetWeights를 BvaDimension 기반으로 재설계 |
| `lib/utils/score.ts` | 벤치마크 기반 계산식으로 전면 교체 |
| `lib/services/recommendation.service.ts` | 새 계산식 적용 |

### UI 컴포넌트 (10파일)

| 컴포넌트 | 변경 내용 |
|----------|----------|
| `shared/score-badge.tsx` | 벤치마크 점수 표시로 전환 또는 제거 |
| `detail/score-overview.tsx` | BVA 차원별 벤치마크 기반 점수로 교체 |
| `detail/similar-models.tsx` | 대표 벤치마크 2개로 대체 |
| `detail/benchmark-chart.tsx` | 신규 벤치마크 추가 확장 |
| `explore/model-card.tsx` | 벤치마크 기반 대표 지표로 전환 |
| `home/new-models-section.tsx` | 동일 전환 |
| `compare/compare-row.tsx` | BVA 차원별 비교로 교체 |
| `recommendations/fitness-score-bar.tsx` | 새 계산식 적용 |
| `recommendations/oss-fitness-ranking.tsx` | 동일 |
| `recommendations/preset-card.tsx` | 구조 변경 최소 |

### 데이터/스키마 (3파일)

| 파일 | 변경 내용 |
|------|----------|
| `db/models/model.ts` | scores 스키마 제거, compliance 추가 |
| `data/models.json` | 87개 모델: scores 제거, compliance 추가, KMMLU 추가 |
| `data/industry-presets.json` | weights를 BvaDimension 키 기반으로 재설계 |

### 신규 파일

| 파일 | 용도 |
|------|------|
| `db/models/benchmark-meta.ts` | BenchmarkMeta 스키마 |
| `db/models/bva-dimension.ts` | BvaDimension 스키마 |
| `data/benchmark-meta.json` | 벤치마크 메타 시드 데이터 (7개) |
| `data/bva-dimensions.json` | BVA 차원 매핑 시드 데이터 (4개) |
| `lib/services/bva.service.ts` | BVA 계산 서비스 |
| `lib/types/bva.ts` | BVA 관련 타입 |
| `components/bva/*` | BVA 입력폼, 리포트 UI |
| `app/bva/*` | BVA 페이지 라우트 |
| `app/methodology/*` | 평가 방법론 페이지 |

### 테스트 (8+파일 수정)

score.test.ts, recommendation.service.test.ts, model-card.test.tsx,
compare-grid.test.tsx, explore-client.test.tsx, model-table.test.tsx,
fitness-score-bar.test.tsx, seed.test.ts

---

## 7. 위험 및 대응

| 위험 | 대응 |
|------|------|
| KMMLU 데이터 부분적 (일부 모델 N/A) | null 허용, 가용 벤치마크로 재정규화 |
| 기존 추천 결과 변동 | BVA 목적에 부합하는 예상된 변경 |
| 대규모 시드 데이터 수정 | 마이그레이션 스크립트로 일괄 처리 |
| reliability 차원 부재 | 1차 출시 후 환각 벤치마크 확보 시 추가 |

---

## 8. 핵심 원칙

- 모든 점수는 출처(벤치마크)가 명시되어야 한다
- 계산식은 고객에게 설명 가능해야 한다
- 벤치마크 용어에는 반드시 고객 친화적 설명이 동반되어야 한다
- 정량화 불가 항목(보안/컴플라이언스)은 태그로 관리한다
- 데이터가 없는 벤치마크는 추정치를 넣지 않는다 (null 허용)

---

## 9. 상세 설계 참조

- 데이터 모델 상세: `docs/plans/2026-03-11-plan-bva-data-model-spec.md`
- 벤치마크 리서치: `docs/plans/2026-03-11-plan-bva-benchmark-research.md`
