/**
 * @jest-environment node
 */
jest.mock('@arizeai/phoenix-client', () => ({
  createClient: jest.fn(() => ({
    GET: jest.fn().mockResolvedValue({ data: [] }),
  })),
}))
jest.mock('@arizeai/phoenix-client/datasets', () => ({
  createDataset: jest.fn().mockResolvedValue({ datasetId: 'ds-123' }),
}))
jest.mock('@arizeai/phoenix-client/experiments', () => ({
  runExperiment: jest.fn().mockResolvedValue({
    id: 'exp-1',
    runs: {},
    evaluationRuns: [],
  }),
  asExperimentEvaluator: jest.fn((e) => e),
}))
jest.mock('@arizeai/phoenix-evals', () => ({
  createCorrectnessEvaluator: jest.fn(() => ({
    evaluate: jest.fn().mockResolvedValue({ score: 1, label: 'correct', explanation: 'ok' }),
  })),
  createHallucinationEvaluator: jest.fn(() => ({
    evaluate: jest.fn().mockResolvedValue({ score: 1, label: 'factual', explanation: 'ok' }),
  })),
  createDocumentRelevanceEvaluator: jest.fn(() => ({
    evaluate: jest.fn().mockResolvedValue({ score: 1, label: 'relevant', explanation: 'ok' }),
  })),
}))
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn(() => 'mock-model')),
}))

import {
  checkPhoenixHealth,
  createPhoenixDataset,
  buildEvaluators,
  runPhoenixExperiment,
} from '@/lib/services/phoenix.service'

beforeEach(() => {
  process.env.PHOENIX_HOST = 'http://localhost:6006'
  process.env.OPENROUTER_API_KEY = 'test-key'
})
afterEach(() => {
  delete process.env.PHOENIX_HOST
  delete process.env.OPENROUTER_API_KEY
})

describe('checkPhoenixHealth', () => {
  it('returns true when Phoenix is reachable', async () => {
    const result = await checkPhoenixHealth()
    expect(result).toBe(true)
  })

  it('returns false when PHOENIX_HOST is not set', async () => {
    delete process.env.PHOENIX_HOST
    const result = await checkPhoenixHealth()
    expect(result).toBe(false)
  })
})

describe('createPhoenixDataset', () => {
  it('creates dataset and returns datasetId', async () => {
    const { createDataset } = require('@arizeai/phoenix-client/datasets')

    const result = await createPhoenixDataset({
      name: 'test-dataset',
      rows: [{ question: 'What is 1+1?', ground_truth: '2' }],
    })

    expect(result.datasetId).toBe('ds-123')
    expect(createDataset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-dataset',
        description: expect.stringContaining('1 rows'),
        examples: expect.arrayContaining([
          expect.objectContaining({
            input: expect.objectContaining({ question: 'What is 1+1?' }),
            output: expect.objectContaining({ answer: '2' }),
          }),
        ]),
      }),
    )
  })
})

describe('buildEvaluators', () => {
  it('builds correctness evaluator', async () => {
    const evaluators = await buildEvaluators(['correctness'])
    expect(evaluators).toHaveLength(1)
  })

  it('builds multiple evaluators', async () => {
    const evaluators = await buildEvaluators(['correctness', 'hallucination', 'relevance'])
    expect(evaluators).toHaveLength(3)
  })

  it('returns empty array for no evaluator names', async () => {
    const evaluators = await buildEvaluators([])
    expect(evaluators).toHaveLength(0)
  })
})

describe('runPhoenixExperiment', () => {
  it('runs experiment and returns result', async () => {
    const evaluators = await buildEvaluators(['correctness'])
    const task = jest.fn().mockResolvedValue('test output')

    const result = await runPhoenixExperiment({
      datasetId: 'ds-123',
      experimentName: 'test-exp',
      task: task as unknown as (example: { input: Record<string, unknown> }) => Promise<string>,
      evaluators,
    })

    expect(result).toBeDefined()
    expect(result.id).toBe('exp-1')
  })
})
