export const BENCHMARKS = {
  mmlu:      { label: 'MMLU', description: '대규모 다분야 언어 이해', maxScore: 100 },
  gpqa:      { label: 'GPQA', description: '대학원 수준 과학 질의응답', maxScore: 100 },
  swe_bench: { label: 'SWE-bench', description: '소프트웨어 엔지니어링 벤치마크', maxScore: 100 },
  aime:      { label: 'AIME', description: '수학 경시대회 문제', maxScore: 100 },
  hle:       { label: 'HLE', description: '인간 수준 추정', maxScore: 100 },
  mgsm:      { label: 'MGSM', description: '다국어 수학 추론', maxScore: 100 },
} as const
