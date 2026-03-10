/**
 * @jest-environment node
 */
import { getGpuList, getGpuBySlug, getCompatibleModels } from '@/lib/services/gpu.service'
import { ModelModel } from '@/lib/db/models/model'

const mockGpus = [
  { name: 'A100 80GB', slug: 'a100-80gb', vendor: 'NVIDIA', vram: 80, memoryType: 'HBM2e', fp16Tflops: 312, int8Tops: 624, tdp: 300, msrp: 10000, cloudHourly: 1.10, category: 'datacenter', notes: '' },
  { name: 'NVIDIA RTX 4090', slug: 'rtx-4090', vendor: 'NVIDIA', vram: 24, memoryType: 'GDDR6X', fp16Tflops: 165, int8Tops: 660, tdp: 450, msrp: 1599, cloudHourly: 0.40, category: 'consumer', notes: '' },
]

const mockOssModels = [
  {
    name: 'Qwen3 32B', slug: 'qwen3-32b', provider: 'Alibaba Cloud',
    type: 'open-source', parameterSize: 32, architecture: 'dense',
    infrastructure: { minGpu: 'NVIDIA RTX 4090', vramFp16: 64, vramInt8: 32, vramInt4: 18, estimatedTps: 35, recommendedFramework: ['vLLM'] },
  },
  {
    name: 'Llama 3.3 8B', slug: 'llama-3-3-8b', provider: 'Meta',
    type: 'open-source', parameterSize: 8, architecture: 'dense',
    infrastructure: { minGpu: 'NVIDIA RTX 4090', vramFp16: 16, vramInt8: 8, vramInt4: 5, estimatedTps: 80, recommendedFramework: ['vLLM'] },
  },
  {
    name: 'Big Model 500B', slug: 'big-model-500b', provider: 'BigCo',
    type: 'open-source', parameterSize: 500, architecture: 'dense',
    infrastructure: { minGpu: 'NVIDIA A100 80GB', vramFp16: 1000, vramInt8: 500, vramInt4: 250, estimatedTps: 10, recommendedFramework: ['vLLM'] },
  },
]

jest.mock('@/lib/db/models/gpu-reference', () => ({
  GpuReferenceModel: {
    find: jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockGpus),
      }),
      lean: jest.fn().mockResolvedValue(mockGpus),
    })),
    findOne: jest.fn().mockImplementation(({ slug }: { slug: string }) => ({
      lean: jest.fn().mockResolvedValue(
        mockGpus.find((g) => g.slug === slug) ?? null
      ),
    })),
  },
}))

jest.mock('@/lib/db/models/model', () => ({
  ModelModel: {
    find: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(mockOssModels),
    })),
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

describe('GPU Service', () => {
  describe('getGpuList', () => {
    it('should return GPU list', async () => {
      const result = await getGpuList({})
      expect(result).toHaveLength(2)
    })

    it('should return items with expected fields', async () => {
      const result = await getGpuList({})
      expect(result[0]).toHaveProperty('slug', 'a100-80gb')
      expect(result[0]).toHaveProperty('vram', 80)
    })
  })

  describe('getGpuBySlug', () => {
    it('should return a GPU by slug', async () => {
      const result = await getGpuBySlug('a100-80gb')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('A100 80GB')
      expect(result!.slug).toBe('a100-80gb')
    })

    it('should return null for unknown slug', async () => {
      const result = await getGpuBySlug('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getCompatibleModels', () => {
    it('should return models that fit in GPU VRAM', async () => {
      // RTX 4090 has 24GB VRAM, 165 TFLOPS
      const result = await getCompatibleModels(24, 165)
      // Llama 8B fits: fp16=16GB, int8=8GB, int4=5GB -> best=fp16 (16<=24)
      // Qwen3 32B: fp16=64GB, int8=32GB, int4=18GB -> best=int4 (18<=24)
      // Big Model: fp16=1000, int8=500, int4=250 -> none fit
      expect(result).toHaveLength(2)
    })

    it('should determine best quantization level correctly', async () => {
      const result = await getCompatibleModels(24, 165)
      const llama = result.find((m) => m.name === 'Llama 3.3 8B')
      const qwen = result.find((m) => m.name === 'Qwen3 32B')
      expect(llama!.bestQuantization).toBe('fp16')
      expect(qwen!.bestQuantization).toBe('int4')
    })

    it('should sort by estimatedTps descending', async () => {
      const result = await getCompatibleModels(24, 165)
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].estimatedTps).toBeGreaterThanOrEqual(result[i].estimatedTps)
      }
    })

    it('should include allQuantizations array', async () => {
      const result = await getCompatibleModels(24, 165)
      const llama = result.find((m) => m.name === 'Llama 3.3 8B')!
      expect(llama.allQuantizations).toHaveLength(3)
      expect(llama.allQuantizations[0]).toEqual({ level: 'fp16', vramRequired: 16, fits: true })
      expect(llama.allQuantizations[1]).toEqual({ level: 'int8', vramRequired: 8, fits: true })
      expect(llama.allQuantizations[2]).toEqual({ level: 'int4', vramRequired: 5, fits: true })
    })

    it('should exclude models that do not fit at any quantization', async () => {
      const result = await getCompatibleModels(24, 165)
      const bigModel = result.find((m) => m.name === 'Big Model 500B')
      expect(bigModel).toBeUndefined()
    })

    it('should scale TPS based on GPU TFLOPS ratio', async () => {
      // Reference GPU is RTX 4090 with 165 TFLOPS
      // If we test with a GPU at 330 TFLOPS (2x), TPS should double
      const result = await getCompatibleModels(24, 330)
      const llama = result.find((m) => m.name === 'Llama 3.3 8B')
      // baseTps=80, ratio=330/165=2.0, scaled=160
      expect(llama!.estimatedTps).toBe(160)
    })
  })

  describe('getCompatibleModels — expanded quantizations', () => {
    const mockModelsWithAllQuant = [
      {
        name: 'FullQuant 7B', slug: 'fullquant-7b', provider: 'TestCo',
        type: 'open-source', parameterSize: 7, architecture: 'dense',
        infrastructure: {
          minGpu: 'NVIDIA RTX 4090', estimatedTps: 60, recommendedFramework: ['vLLM'],
          vramFp16: 14, vramFp8: 8, vramInt8: 7, vramInt4: 4,
          vramQ6k: 6, vramQ5k: 5, vramQ4kM: 3.5, vramQ3k: 3, vramQ2k: 2.5,
        },
      },
    ]

    const mockModelsLegacyOnly = [
      {
        name: 'Legacy 7B', slug: 'legacy-7b', provider: 'OldCo',
        type: 'open-source', parameterSize: 7, architecture: 'dense',
        infrastructure: {
          minGpu: 'NVIDIA RTX 4090', estimatedTps: 50, recommendedFramework: ['vLLM'],
          vramFp16: 14, vramInt8: 7, vramInt4: 4,
        },
      },
    ]

    function setMockModels(models: readonly any[]) {
      jest.mocked(ModelModel.find).mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(models),
      } as any))
    }

    it('should return all 9 quantization levels when model has all VRAM fields', async () => {
      setMockModels(mockModelsWithAllQuant)
      const result = await getCompatibleModels(24, 165)
      const model = result.find((m) => m.name === 'FullQuant 7B')!
      expect(model.allQuantizations).toHaveLength(9)
    })

    it('should return only 3 quantization levels for legacy models', async () => {
      setMockModels(mockModelsLegacyOnly)
      const result = await getCompatibleModels(24, 165)
      const model = result.find((m) => m.name === 'Legacy 7B')!
      expect(model.allQuantizations).toHaveLength(3)
      const levels = model.allQuantizations.map((q) => q.level)
      expect(levels).toEqual(['fp16', 'int8', 'int4'])
    })

    it('should include new quantization levels when model has those VRAM fields', async () => {
      setMockModels(mockModelsWithAllQuant)
      const result = await getCompatibleModels(24, 165)
      const model = result.find((m) => m.name === 'FullQuant 7B')!
      const levels = model.allQuantizations.map((q) => q.level)
      expect(levels).toContain('fp8')
      expect(levels).toContain('q6_k')
      expect(levels).toContain('q5_k')
      expect(levels).toContain('q4_k_m')
      expect(levels).toContain('q3_k')
      expect(levels).toContain('q2_k')
    })

    it('should order quantization levels by precision (fp16 first, q2_k last)', async () => {
      setMockModels(mockModelsWithAllQuant)
      const result = await getCompatibleModels(24, 165)
      const model = result.find((m) => m.name === 'FullQuant 7B')!
      const levels = model.allQuantizations.map((q) => q.level)
      expect(levels).toEqual([
        'fp16', 'fp8', 'int8', 'int4', 'q6_k', 'q5_k', 'q4_k_m', 'q3_k', 'q2_k',
      ])
    })

    it('should pick bestQuantization as highest precision that fits', async () => {
      // With 24GB VRAM: fp16=14 fits, fp8=8 fits, etc. -> best should be fp16
      setMockModels(mockModelsWithAllQuant)
      const result = await getCompatibleModels(24, 165)
      const model = result.find((m) => m.name === 'FullQuant 7B')!
      expect(model.bestQuantization).toBe('fp16')
    })

    it('should pick fp8 as best when fp16 does not fit', async () => {
      setMockModels(mockModelsWithAllQuant)
      // 10GB VRAM: fp16=14 no, fp8=8 yes -> best=fp8
      const result = await getCompatibleModels(10, 165)
      const model = result.find((m) => m.name === 'FullQuant 7B')!
      expect(model.bestQuantization).toBe('fp8')
    })

    it('should pick q4_k_m as best when only smaller levels fit', async () => {
      setMockModels(mockModelsWithAllQuant)
      // 3.5GB: fp16=14 no, fp8=8 no, int8=7 no, int4=4 no, q6_k=6 no, q5_k=5 no, q4_k_m=3.5 yes
      const result = await getCompatibleModels(3.5, 165)
      const model = result.find((m) => m.name === 'FullQuant 7B')!
      expect(model.bestQuantization).toBe('q4_k_m')
    })

    afterEach(() => {
      // Restore default mock
      jest.mocked(ModelModel.find).mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(mockOssModels),
      } as any))
    })
  })

  describe('getCompatibleModels — tpsFormula metadata', () => {
    it('should include tpsFormula field in each compatible model', async () => {
      const result = await getCompatibleModels(24, 165)
      for (const model of result) {
        expect(model).toHaveProperty('tpsFormula')
      }
    })

    it('should contain correct tpsFormula fields when ref GPU is found', async () => {
      const result = await getCompatibleModels(24, 165)
      const llama = result.find((m) => m.name === 'Llama 3.3 8B')!
      expect(llama.tpsFormula).not.toBeNull()
      expect(llama.tpsFormula).toEqual({
        baseTps: 80,
        refGpuName: 'NVIDIA RTX 4090',
        refTflops: 165,
        targetTflops: 165,
        ratio: 1,
      })
    })

    it('should have tpsFormula as null when ref GPU TFLOPS cannot be determined', async () => {
      const mockModelsUnknownGpu = [
        {
          name: 'Unknown GPU Model', slug: 'unknown-gpu', provider: 'TestCo',
          type: 'open-source', parameterSize: 7, architecture: 'dense',
          infrastructure: {
            minGpu: 'Unknown GPU XYZ', estimatedTps: 50, recommendedFramework: ['vLLM'],
            vramFp16: 14, vramInt8: 7, vramInt4: 4,
          },
        },
      ]
      jest.mocked(ModelModel.find).mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(mockModelsUnknownGpu),
      } as any))

      const result = await getCompatibleModels(24, 165)
      const model = result.find((m) => m.name === 'Unknown GPU Model')!
      expect(model.tpsFormula).toBeNull()
    })

    it('should calculate ratio correctly as targetTflops / refTflops', async () => {
      // RTX 4090 refTflops = 165, target = 330 -> ratio = 2.0
      const result = await getCompatibleModels(24, 330)
      const llama = result.find((m) => m.name === 'Llama 3.3 8B')!
      expect(llama.tpsFormula).toEqual({
        baseTps: 80,
        refGpuName: 'NVIDIA RTX 4090',
        refTflops: 165,
        targetTflops: 330,
        ratio: 2,
      })
    })

    afterEach(() => {
      jest.mocked(ModelModel.find).mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(mockOssModels),
      } as any))
    })
  })
})
