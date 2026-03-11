import type { IBvaDimension } from '@/lib/types/bva'

export const BVA_DIMENSIONS: readonly IBvaDimension[] = [
  {
    key: 'reasoning',
    displayName: '종합 추론력',
    description: '복잡한 문제를 단계적으로 분석하고 해결하는 능력',
    formula: [
      { benchmark: 'gpqa', weight: 0.4 },
      { benchmark: 'aime', weight: 0.3 },
      { benchmark: 'hle', weight: 0.3 },
    ],
    formulaExplanation: '대학원 수준 과학(GPQA 40%) + 수학 경시대회(AIME 30%) + 최고 난이도 추론(HLE 30%)',
  },
  {
    key: 'korean',
    displayName: '한국어 능력',
    description: '한국어 이해, 생성, 지식 범위 종합 평가',
    formula: [
      { benchmark: 'kmmlu', weight: 0.7 },
      { benchmark: 'mgsm', weight: 0.3 },
    ],
    formulaExplanation: '한국어 지식 이해력(KMMLU 70%) + 다국어 수학 추론(MGSM 30%)',
  },
  {
    key: 'coding',
    displayName: '코딩 능력',
    description: '코드 생성, 디버깅, 실제 SW 엔지니어링 문제 해결',
    formula: [
      { benchmark: 'swe_bench', weight: 1.0 },
    ],
    formulaExplanation: '실제 GitHub 이슈 해결(SWE-bench 100%)',
  },
  {
    key: 'knowledge',
    displayName: '지식 범위',
    description: '다양한 분야의 사실적 지식과 학문적 이해력',
    formula: [
      { benchmark: 'mmlu', weight: 0.7 },
      { benchmark: 'gpqa', weight: 0.3 },
    ],
    formulaExplanation: '57개 분야 지식(MMLU 70%) + 대학원 수준 전문 지식(GPQA 30%)',
  },
  {
    key: 'reliability',
    displayName: '신뢰성',
    description: '환각 방지 및 사실 기반 응답 정확도',
    formula: [
      { benchmark: 'truthfulqa', weight: 1.0 },
    ],
    formulaExplanation: '사실 기반 응답 정확도(TruthfulQA 100%)',
  },
  {
    key: 'toolUse',
    displayName: '도구 호출',
    description: 'Function calling 및 API 활용 능력',
    formula: [
      { benchmark: 'bfcl', weight: 1.0 },
    ],
    formulaExplanation: '함수 호출 정확도(BFCL 100%)',
  },
  {
    key: 'instruction',
    displayName: '명령어 수행',
    description: '프롬프트 지시사항 준수 정확도',
    formula: [
      { benchmark: 'ifeval', weight: 1.0 },
    ],
    formulaExplanation: '명령어 수행 정확도(IFEval 100%)',
  },
  {
    key: 'longContext',
    displayName: '긴 문서 처리',
    description: '롱컨텍스트 환경에서의 성능 유지력',
    formula: [
      { benchmark: 'ruler', weight: 1.0 },
    ],
    formulaExplanation: '롱컨텍스트 성능(RULER 100%)',
  },
] as const
