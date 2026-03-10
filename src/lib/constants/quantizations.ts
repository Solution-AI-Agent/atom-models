import type { QuantizationLevel } from '@/lib/types/gpu'

export interface QuantizationLevelMeta {
  readonly key: QuantizationLevel
  readonly label: string
  readonly description: string
  readonly group: 'standard' | 'gguf'
}

export const QUANTIZATION_LEVELS: readonly QuantizationLevelMeta[] = [
  { key: 'fp16', label: 'FP16', description: '16비트 부동소수점 (풀 정밀도)', group: 'standard' },
  { key: 'fp8', label: 'FP8', description: '8비트 부동소수점', group: 'standard' },
  { key: 'int8', label: 'INT8', description: '8비트 정수 양자화', group: 'standard' },
  { key: 'int4', label: 'INT4', description: '4비트 정수 양자화', group: 'standard' },
  { key: 'q6_k', label: 'Q6_K', description: '6비트 K-퀀트 (GGUF)', group: 'gguf' },
  { key: 'q5_k', label: 'Q5_K', description: '5비트 K-퀀트 (GGUF)', group: 'gguf' },
  { key: 'q4_k_m', label: 'Q4_K_M', description: '4비트 K-퀀트 미디엄 (GGUF)', group: 'gguf' },
  { key: 'q3_k', label: 'Q3_K', description: '3비트 K-퀀트 (GGUF)', group: 'gguf' },
  { key: 'q2_k', label: 'Q2_K', description: '2비트 K-퀀트 (GGUF)', group: 'gguf' },
] as const
