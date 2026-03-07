/**
 * @jest-environment node
 */
jest.mock('@/lib/services/model.service')

import { GET } from '@/app/api/models/route'
import * as modelService from '@/lib/services/model.service'

const mockGetModels = modelService.getModels as jest.MockedFunction<typeof modelService.getModels>

describe('GET /api/models integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 with models array', async () => {
    mockGetModels.mockResolvedValue({
      models: [{ name: 'Test', slug: 'test' }],
      total: 1,
      page: 1,
      limit: 50,
    })

    const req = new Request('http://localhost/api/models')
    const res = await GET(req as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('should return 500 on service error', async () => {
    mockGetModels.mockRejectedValue(new Error('DB error'))

    const req = new Request('http://localhost/api/models')
    const res = await GET(req as any)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  it('should pass filter params to service', async () => {
    mockGetModels.mockResolvedValue({ models: [], total: 0, page: 1, limit: 50 })

    const req = new Request('http://localhost/api/models?type=commercial&provider=OpenAI&page=2&limit=10')
    await GET(req as any)

    expect(mockGetModels).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'commercial',
        provider: 'OpenAI',
        page: 2,
        limit: 10,
      })
    )
  })

  it('should return meta with pagination info', async () => {
    mockGetModels.mockResolvedValue({
      models: [{ name: 'A', slug: 'a' }],
      total: 100,
      page: 3,
      limit: 10,
    })

    const req = new Request('http://localhost/api/models?page=3&limit=10')
    const res = await GET(req as any)
    const body = await res.json()

    expect(body.meta).toEqual({ total: 100, page: 3, limit: 10 })
  })
})
