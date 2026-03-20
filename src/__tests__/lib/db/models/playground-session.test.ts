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

  it('should have new split metrics fields in message schema', async () => {
    const { PlaygroundSessionModel } = await import(
      '@/lib/db/models/playground-session'
    )
    const schemaPaths = PlaygroundSessionModel.schema.subpaths
    expect(schemaPaths['messages.metrics.reasoningTtft']).toBeDefined()
    expect(schemaPaths['messages.metrics.reasoningTps']).toBeDefined()
    expect(schemaPaths['messages.metrics.reasoningTokens']).toBeDefined()
    expect(schemaPaths['messages.metrics.contentTtft']).toBeDefined()
    expect(schemaPaths['messages.metrics.contentTps']).toBeDefined()
    expect(schemaPaths['messages.metrics.contentTokens']).toBeDefined()
  })
})
