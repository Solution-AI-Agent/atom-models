export const MODEL_TIERS = {
  flagship: { label: '플래그십', paramRange: '70B+',  description: '최고 성능 모델' },
  mid:      { label: '중형',    paramRange: '7B-70B', description: '성능과 비용의 균형' },
  light:    { label: '경량',    paramRange: '<7B',    description: '가성비/경량 모델' },
} as const
