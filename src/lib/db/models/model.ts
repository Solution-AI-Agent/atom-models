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
  compliance: {
    soc2: boolean
    hipaa: boolean
    gdpr: boolean
    onPremise: boolean
    dataExclusion: boolean
  }
  languageScores: Map<string, number>
  benchmarks: Map<string, number | null>
  infrastructure: {
    minGpu: string
    vramFp16: number
    vramFp8?: number
    vramInt8: number
    vramInt4: number
    vramQ6k?: number
    vramQ5k?: number
    vramQ4kM?: number
    vramQ3k?: number
    vramQ2k?: number
    recommendedFramework: string[]
    estimatedTps: number
  } | null
  releaseDate: Date
  memo: string
  sourceUrls: string[]
  colorCode: string
  openRouterModelId: string | null
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

  compliance: {
    soc2:          { type: Boolean, default: false },
    hipaa:         { type: Boolean, default: false },
    gdpr:          { type: Boolean, default: false },
    onPremise:     { type: Boolean, default: false },
    dataExclusion: { type: Boolean, default: false },
  },

  languageScores: { type: Map, of: Number },
  benchmarks:     { type: Map, of: Schema.Types.Mixed },

  infrastructure: {
    minGpu:               String,
    vramFp16:             Number,
    vramFp8:              Number,
    vramInt8:             Number,
    vramInt4:             Number,
    vramQ6k:              Number,
    vramQ5k:              Number,
    vramQ4kM:             Number,
    vramQ3k:              Number,
    vramQ2k:              Number,
    recommendedFramework: [String],
    estimatedTps:         Number,
  },

  releaseDate:    { type: Date, required: true },
  memo:           String,
  sourceUrls:     [String],
  colorCode:          String,
  openRouterModelId:  { type: String, default: null },
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
