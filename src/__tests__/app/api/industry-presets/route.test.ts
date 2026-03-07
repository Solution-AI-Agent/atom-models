/**
 * @jest-environment node
 */
jest.mock('@/lib/services/preset.service')

import { GET } from '@/app/api/industry-presets/route'
import { getAllPresets } from '@/lib/services/preset.service'

const mockGetAllPresets = getAllPresets as jest.MockedFunction<typeof getAllPresets>

describe('GET /api/industry-presets', () => {
  it('should return presets', async () => {
    mockGetAllPresets.mockResolvedValue([
      { category: '고객 서비스', categorySlug: 'customer-service', taskType: 'CS 챗봇' },
    ] as any)

    const request = new Request('http://localhost/api/industry-presets')
    const response = await GET(request as any)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})
