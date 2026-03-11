export const BENCHMARKS = {
  mmlu:      { label: 'MMLU',       description: '대학 수준 지식 이해력',  maxScore: 100 },
  gpqa:      { label: 'GPQA',       description: '대학원 수준 과학 추론',  maxScore: 100 },
  swe_bench: { label: 'SWE-bench',  description: '소프트웨어 엔지니어링',   maxScore: 100 },
  aime:      { label: 'AIME',       description: '수학 경시대회 추론',     maxScore: 100 },
  hle:       { label: 'HLE',        description: '최고 난이도 추론',       maxScore: 100 },
  mgsm:      { label: 'MGSM',       description: '다국어 수학 추론',       maxScore: 100 },
  kmmlu:     { label: 'KMMLU',      description: '한국어 지식 이해력',     maxScore: 100 },
} as const
