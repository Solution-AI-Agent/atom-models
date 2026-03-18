import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPlaygroundSessionDocument extends Document {
  title: string
  models: {
    modelId: mongoose.Types.ObjectId
    modelName: string
    provider: string
    openRouterModelId: string
    colorCode: string
    parameters: {
      temperature?: number
      maxTokens?: number
      topP?: number
      reasoningEffort?: 'low' | 'medium' | 'high'
    }
  }[]
  systemPrompt: string
  messages: {
    role: 'user' | 'assistant'
    content: string
    reasoning?: string
    modelId?: mongoose.Types.ObjectId
    metrics?: {
      ttft: number
      totalTime: number
      tps: number
      inputTokens: number
      outputTokens: number
      estimatedCost: number
    }
    createdAt: Date
  }[]
  defaultParameters: {
    temperature: number
    maxTokens: number
    topP: number
    reasoningEffort: 'low' | 'medium' | 'high'
  }
}

const PlaygroundSessionSchema = new Schema({
  title: { type: String, required: true },
  models: [{
    modelId:           { type: Schema.Types.ObjectId, ref: 'Model', required: true },
    modelName:         { type: String, required: true },
    provider:          { type: String, required: true },
    openRouterModelId: { type: String, required: true },
    colorCode:         { type: String, default: '#888888' },
    parameters: {
      temperature:     Number,
      maxTokens:       Number,
      topP:            Number,
      reasoningEffort: { type: String, enum: ['low', 'medium', 'high'] },
    },
  }],
  systemPrompt: { type: String, default: '' },
  messages: [{
    role:      { type: String, enum: ['user', 'assistant'], required: true },
    content:   { type: String, default: '' },
    reasoning: { type: String },
    modelId:   { type: Schema.Types.ObjectId, ref: 'Model' },
    metrics: {
      ttft:           Number,
      totalTime:      Number,
      tps:            Number,
      inputTokens:    Number,
      outputTokens:   Number,
      estimatedCost:  Number,
    },
    createdAt: { type: Date, default: Date.now },
  }],
  defaultParameters: {
    temperature:     { type: Number, default: 0.7 },
    maxTokens:       { type: Number, default: 16384 },
    topP:            { type: Number, default: 1.0 },
    reasoningEffort: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
})

PlaygroundSessionSchema.index({ createdAt: -1 })

export const PlaygroundSessionModel: Model<IPlaygroundSessionDocument> =
  mongoose.models.PlaygroundSession ||
  mongoose.model<IPlaygroundSessionDocument>('PlaygroundSession', PlaygroundSessionSchema)
