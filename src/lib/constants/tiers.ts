export const MODEL_TIERS = {
  flagship: { label: '플래그십', paramRange: '200B+', description: '최고 성능 모델' },
  mid:      { label: '중형', paramRange: '30B-200B', description: '성능과 비용의 균형' },
  small:    { label: '소형', paramRange: '7B-30B', description: '가성비 우수' },
  mini:     { label: '미니', paramRange: '1B-7B', description: '경량 모델' },
  micro:    { label: '초소형', paramRange: '<1B', description: '임베디드/엣지용' },
} as const
