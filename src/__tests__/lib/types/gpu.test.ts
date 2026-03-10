import type { QuantizationLevel, ICompatibleModel } from '@/lib/types/gpu'

describe('GPU types', () => {
  describe('QuantizationLevel', () => {
    it('should accept all standard quantization levels', () => {
      const standardLevels: QuantizationLevel[] = ['fp16', 'fp8', 'int8', 'int4']
      expect(standardLevels).toHaveLength(4)
    })

    it('should accept all GGUF quantization levels', () => {
      const ggufLevels: QuantizationLevel[] = ['q6_k', 'q5_k', 'q4_k_m', 'q3_k', 'q2_k']
      expect(ggufLevels).toHaveLength(5)
    })

    it('should support all 9 quantization levels in total', () => {
      const allLevels: QuantizationLevel[] = [
        'fp16', 'fp8', 'int8', 'int4',
        'q6_k', 'q5_k', 'q4_k_m', 'q3_k', 'q2_k',
      ]
      expect(allLevels).toHaveLength(9)
    })
  })

  describe('ICompatibleModel', () => {
    it('should allow allQuantizations with expanded quantization levels', () => {
      const model: ICompatibleModel = {
        name: 'Test Model',
        slug: 'test-model',
        provider: 'TestProvider',
        parameterSize: 32,
        architecture: 'dense',
        bestQuantization: 'q4_k_m',
        vramRequired: 20,
        estimatedTps: 50,
        allQuantizations: [
          { level: 'fp16', vramRequired: 64, fits: false },
          { level: 'fp8', vramRequired: 32, fits: false },
          { level: 'int8', vramRequired: 32, fits: false },
          { level: 'int4', vramRequired: 16, fits: true },
          { level: 'q6_k', vramRequired: 29, fits: false },
          { level: 'q5_k', vramRequired: 24, fits: false },
          { level: 'q4_k_m', vramRequired: 20, fits: true },
          { level: 'q3_k', vramRequired: 14, fits: true },
          { level: 'q2_k', vramRequired: 10, fits: true },
        ],
        tpsFormula: { baseTps: 50, refGpuName: 'NVIDIA RTX 4090', refTflops: 165, targetTflops: 165, ratio: 1 },
      }

      expect(model.allQuantizations).toHaveLength(9)
      expect(model.bestQuantization).toBe('q4_k_m')
    })
  })
})
