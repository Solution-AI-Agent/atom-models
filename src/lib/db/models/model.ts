import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IModelDocument extends Document {
  name: string
  slug: string
  provider: string
  type: 'commercial' | 'open-source'
  tier: 'flagship' | 'mid' | 'small' | 'mini' | 'micro'
  parameterSize: number | null
  activeParameters: number | null
  architecture: 'dense' | 'moe'
  contextWindow: number
  maxOutput: number
  license: string
  pricing: {
    input: number
    output: number
    cachingDiscount: number
    batchDiscount: number
  }
  scores: {
    quality: number
    speed: number
    reasoning: number
    coding: number
    multimodal: number
  }
  languageScores: Map<string, number>
  benchmarks: Map<string, number>
  infrastructure: {
    minGpu: string
    vramFp16: number
    vramInt8: number
    vramInt4: number
    recommendedFramework: string[]
    estimatedTps: number
  } | null
  releaseDate: Date
  memo: string
  sourceUrls: string[]
  colorCode: string
  lastVerifiedAt: Date
  isRecentlyReleased: boolean
}

export const ModelSchema = new Schema({
  name:          { type: String, required: true, unique: true },
  slug:          { type: String, required: true, unique: true, index: true },
  provider:      { type: String, required: true, index: true },
  type:          { type: String, enum: ['commercial', 'open-source'], required: true, index: true },
  tier:          { type: String, enum: ['flagship', 'mid', 'small', 'mini', 'micro'], index: true },

  parameterSize:    Number,
  activeParameters: Number,
  architecture:     { type: String, enum: ['dense', 'moe'] },
  contextWindow:    Number,
  maxOutput:        Number,
  license:          String,

  pricing: {
    input:           Number,
    output:          Number,
    cachingDiscount: Number,
    batchDiscount:   Number,
  },

  scores: {
    quality:    Number,
    speed:      Number,
    reasoning:  Number,
    coding:     Number,
    multimodal: Number,
  },

  languageScores: { type: Map, of: Number },
  benchmarks:     { type: Map, of: Schema.Types.Mixed },

  infrastructure: {
    minGpu:               String,
    vramFp16:             Number,
    vramInt8:             Number,
    vramInt4:             Number,
    recommendedFramework: [String],
    estimatedTps:         Number,
  },

  releaseDate:    { type: Date, required: true },
  memo:           String,
  sourceUrls:     [String],
  colorCode:      String,
  lastVerifiedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

ModelSchema.virtual('isRecentlyReleased').get(function() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return this.releaseDate >= thirtyDaysAgo
})

ModelSchema.index({ provider: 1, type: 1 })
ModelSchema.index({ 'pricing.input': 1 })
ModelSchema.index({ releaseDate: -1 })
ModelSchema.index({ name: 'text', provider: 'text' })

export const ModelModel: Model<IModelDocument> =
  mongoose.models.Model || mongoose.model<IModelDocument>('Model', ModelSchema)
