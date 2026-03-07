/**
 * @jest-environment node
 */
jest.mock('@/lib/services/model.service')

import { GET } from '@/app/api/models/route'
import { getModels } from '@/lib/services/model.service'

const mockGetModels = getModels as jest.MockedFunction<typeof getModels>

describe('GET /api/models', () => {
  it('should return models with success response', async () => {
    mockGetModels.mockResolvedValue({
      models: [{ name: 'Test', slug: 'test' }],
      total: 1,
      page: 1,
      limit: 50,
    })

    const request = new Request('http://localhost/api/models')
    const response = await GET(request as any)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.meta.total).toBe(1)
  })

  it('should pass query params to service', async () => {
    mockGetModels.mockResolvedValue({ models: [], total: 0, page: 1, limit: 50 })

    const request = new Request('http://localhost/api/models?type=commercial&provider=OpenAI')
    await GET(request as any)

    expect(mockGetModels).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'commercial', provider: 'OpenAI' })
    )
  })
})
