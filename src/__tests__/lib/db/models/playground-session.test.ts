/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals'

describe('PlaygroundSession Model', () => {
  it('should export PlaygroundSessionModel', async () => {
    const { PlaygroundSessionModel } = await import(
      '@/lib/db/models/playground-session'
    )
    expect(PlaygroundSessionModel).toBeDefined()
    expect(PlaygroundSessionModel.modelName).toBe('PlaygroundSession')
  })

  it('should have required fields in schema', async () => {
    const { PlaygroundSessionModel } = await import(
      '@/lib/db/models/playground-session'
    )
    const schemaPaths = PlaygroundSessionModel.schema.paths
    expect(schemaPaths.title).toBeDefined()
    expect(schemaPaths.systemPrompt).toBeDefined()
    expect(schemaPaths['defaultParameters.temperature']).toBeDefined()
    expect(schemaPaths['defaultParameters.maxTokens']).toBeDefined()
    expect(schemaPaths['defaultParameters.topP']).toBeDefined()
  })
})
