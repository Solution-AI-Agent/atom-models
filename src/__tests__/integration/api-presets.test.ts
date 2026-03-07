/**
 * @jest-environment node
 */
jest.mock('@/lib/services/preset.service')

import { GET } from '@/app/api/industry-presets/route'
import * as presetService from '@/lib/services/preset.service'

const mockGetAllPresets = presetService.getAllPresets as jest.MockedFunction<typeof presetService.getAllPresets>

describe('GET /api/industry-presets integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 with presets array', async () => {
    mockGetAllPresets.mockResolvedValue([
      { category: 'CS', categorySlug: 'customer-service', taskType: 'chatbot', taskTypeSlug: 'chatbot' },
    ] as any)

    const req = new Request('http://localhost/api/industry-presets')
    const res = await GET(req as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it('should return 500 on service error', async () => {
    mockGetAllPresets.mockRejectedValue(new Error('DB error'))

    const req = new Request('http://localhost/api/industry-presets')
    const res = await GET(req as any)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  it('should return empty array when no presets exist', async () => {
    mockGetAllPresets.mockResolvedValue([])

    const req = new Request('http://localhost/api/industry-presets')
    const res = await GET(req as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })
})
