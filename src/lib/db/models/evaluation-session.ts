import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IEvaluationSessionDocument extends Document {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  config: {
    models: {
      modelId: mongoose.Types.ObjectId
      slug: string
      openRouterModelId: string
      modelName: string
      provider: string
      parameters: {
        temperature: number
        maxTokens: number
      }
    }[]
    evaluators: string[]
    systemPrompt?: string
    phoenixDatasetId?: string
  }
  dataset: {
    fileName: string
    rowCount: number
    columns: string[]
  }
  experiments: {
    modelSlug: string
    phoenixExperimentId: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    scores: Record<string, number | undefined>
    results: {
      rowIndex: number
      question: string
      groundTruth: string
      modelResponse: string
      evaluations: Record<string, {
        score: number
        label: string
        explanation: string
      } | undefined>
      latencyMs: number
      tokenCount: { input: number; output: number }
    }[]
    metrics: {
      avgLatencyMs: number
      totalTokens: { input: number; output: number }
      estimatedCost: number
    }
  }[]
  startedAt?: Date
  completedAt?: Date
}

const EvaluationSessionSchema = new Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
  },
  config: {
    models: [{
      modelId:           { type: Schema.Types.ObjectId, ref: 'Model', required: true },
      slug:              { type: String, required: true },
      openRouterModelId: { type: String, required: true },
      modelName:         { type: String, required: true },
      provider:          { type: String, required: true },
      parameters: {
        temperature: { type: Number, default: 0 },
        maxTokens:   { type: Number, default: 1024 },
      },
    }],
    evaluators:      [{ type: String }],
    systemPrompt:    { type: String },
    phoenixDatasetId: { type: String },
  },
  dataset: {
    fileName:  { type: String, required: true },
    rowCount:  { type: Number, required: true },
    columns:   [{ type: String }],
  },
  experiments: [{
    modelSlug:            { type: String, required: true },
    phoenixExperimentId:  { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    scores:  { type: Schema.Types.Mixed, default: {} },
    results: [{
      rowIndex:      Number,
      question:      String,
      groundTruth:   String,
      modelResponse: String,
      evaluations:   { type: Schema.Types.Mixed, default: {} },
      latencyMs:     Number,
      tokenCount: {
        input:  Number,
        output: Number,
      },
    }],
    metrics: {
      avgLatencyMs: Number,
      totalTokens: {
        input:  Number,
        output: Number,
      },
      estimatedCost: Number,
    },
  }],
  startedAt:   Date,
  completedAt: Date,
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
})

EvaluationSessionSchema.index({ createdAt: -1 })
EvaluationSessionSchema.index({ status: 1 })

export const EvaluationSessionModel: Model<IEvaluationSessionDocument> =
  mongoose.models.EvaluationSession ||
  mongoose.model<IEvaluationSessionDocument>('EvaluationSession', EvaluationSessionSchema)
