import { createClient } from '@arizeai/phoenix-client'
import { createDataset } from '@arizeai/phoenix-client/datasets'
import { runExperiment, asExperimentEvaluator } from '@arizeai/phoenix-client/experiments'
import { createOpenAI } from '@ai-sdk/openai'
import type { EvaluatorName } from '@/lib/types/evaluation'

function getPhoenixClient() {
  const baseUrl = process.env.PHOENIX_HOST
  if (!baseUrl) {
    throw new Error('PHOENIX_HOST environment variable is not set')
  }
  return createClient({
    options: {
      baseUrl,
      ...(process.env.PHOENIX_API_KEY && {
        headers: { Authorization: `Bearer ${process.env.PHOENIX_API_KEY}` },
      }),
    },
  })
}

export async function checkPhoenixHealth(): Promise<boolean> {
  try {
    const client = getPhoenixClient()
    await client.GET('/v1/datasets')
    return true
  } catch {
    return false
  }
}

export async function createPhoenixDataset(options: {
  readonly name: string
  readonly rows: readonly Record<string, string>[]
}): Promise<{ datasetId: string }> {
  const client = getPhoenixClient()
  const { datasetId } = await createDataset({
    client,
    name: options.name,
    description: `Evaluation dataset - ${options.rows.length} rows`,
    examples: options.rows.map((row) => ({
      input: { question: row.question, context: row.context },
      output: { answer: row.ground_truth },
      metadata: {},
    })),
  })
  return { datasetId }
}

function getJudgeModel() {
  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  })
  return openrouter(process.env.EVAL_JUDGE_MODEL ?? 'openai/gpt-4o-mini')
}

export async function buildEvaluators(evaluatorNames: readonly EvaluatorName[]) {
  const {
    createCorrectnessEvaluator,
    createHallucinationEvaluator,
    createDocumentRelevanceEvaluator,
  } = await import('@arizeai/phoenix-evals')

  const model = getJudgeModel()
  const evaluators = []

  for (const name of evaluatorNames) {
    if (name === 'correctness') {
      const evaluator = createCorrectnessEvaluator({ model })
      evaluators.push(
        asExperimentEvaluator({
          name: 'correctness',
          kind: 'LLM',
          evaluate: async ({ output, expected }) =>
            evaluator.evaluate({
              input: String(expected?.answer ?? ''),
              output: String(output ?? ''),
            }),
        }),
      )
    }
    if (name === 'hallucination') {
      const evaluator = createHallucinationEvaluator({ model })
      evaluators.push(
        asExperimentEvaluator({
          name: 'hallucination',
          kind: 'LLM',
          evaluate: async ({ input, output }) =>
            evaluator.evaluate({
              input: String(input?.question ?? ''),
              output: String(output ?? ''),
              context: String(input?.context ?? ''),
            }),
        }),
      )
    }
    if (name === 'relevance') {
      const evaluator = createDocumentRelevanceEvaluator({ model })
      evaluators.push(
        asExperimentEvaluator({
          name: 'relevance',
          kind: 'LLM',
          evaluate: async ({ input, output }) =>
            evaluator.evaluate({
              input: String(input?.question ?? ''),
              documentText: String(output ?? ''),
            }),
        }),
      )
    }
  }

  return evaluators
}

export async function runPhoenixExperiment(options: {
  readonly datasetId: string
  readonly experimentName: string
  readonly task: (example: { input: Record<string, unknown> }) => Promise<string>
  readonly evaluators: Awaited<ReturnType<typeof buildEvaluators>>
}) {
  const client = getPhoenixClient()
  const experiment = await runExperiment({
    client,
    dataset: { datasetId: options.datasetId },
    experimentName: options.experimentName,
    task: options.task,
    evaluators: options.evaluators,
  })
  return experiment
}
