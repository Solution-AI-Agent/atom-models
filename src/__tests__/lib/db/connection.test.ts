const mockConnect = jest.fn()

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connect: mockConnect,
    connection: { readyState: 0 },
  },
}))

describe('MongoDB Connection', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv, MONGODB_URI: 'mongodb://test:27017/test' }
    mockConnect.mockResolvedValue({})
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should export getConnection function', async () => {
    const { getConnection } = await import('@/lib/db/connection')
    expect(typeof getConnection).toBe('function')
  })

  it('should throw if MONGODB_URI is not set', async () => {
    delete process.env.MONGODB_URI
    const { getConnection } = await import('@/lib/db/connection')
    await expect(getConnection()).rejects.toThrow('MONGODB_URI')
  })
})
