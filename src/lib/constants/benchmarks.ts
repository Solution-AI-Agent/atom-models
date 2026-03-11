export const BENCHMARKS = {
  mmlu:       { label: 'MMLU',        description: '대학 수준 지식 이해력',     maxScore: 100, category: '지식' },
  gpqa:       { label: 'GPQA',        description: '대학원 수준 과학 추론',     maxScore: 100, category: '추론' },
  swe_bench:  { label: 'SWE-bench',   description: '소프트웨어 엔지니어링',      maxScore: 100, category: '코딩' },
  aime:       { label: 'AIME',        description: '수학 경시대회 추론',        maxScore: 100, category: '추론' },
  hle:        { label: 'HLE',         description: '최고 난이도 추론',          maxScore: 100, category: '추론' },
  mgsm:       { label: 'MGSM',        description: '다국어 수학 추론',          maxScore: 100, category: '한국어' },
  kmmlu:      { label: 'KMMLU',       description: '한국어 지식 이해력',        maxScore: 100, category: '한국어' },
  truthfulqa: { label: 'TruthfulQA',  description: '사실 기반 응답 정확도',      maxScore: 100, category: '신뢰성' },
  bfcl:       { label: 'BFCL',        description: '함수 호출 정확도',          maxScore: 100, category: '도구호출' },
  ifeval:     { label: 'IFEval',      description: '명령어 수행 정확도',        maxScore: 100, category: '명령어수행' },
  ruler:      { label: 'RULER',       description: '롱컨텍스트 성능',           maxScore: 100, category: '긴문서처리' },
} as const
