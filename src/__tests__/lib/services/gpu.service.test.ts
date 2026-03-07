/**
 * @jest-environment node
 */
import { getGpuList } from '@/lib/services/gpu.service'

jest.mock('@/lib/db/models/gpu-reference', () => ({
  GpuReferenceModel: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { name: 'A100', vram: 80, category: 'datacenter' },
          { name: 'RTX 4090', vram: 24, category: 'consumer' },
        ]),
      }),
    }),
  },
}))

jest.mock('@/lib/db/connection', () => ({
  getConnection: jest.fn().mockResolvedValue({}),
}))

describe('GPU Service', () => {
  it('should return GPU list', async () => {
    const result = await getGpuList({})
    expect(result).toHaveLength(2)
  })
})
