import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IModelDocument extends Document {
  name: string
  slug: string
  providerId: string
  type: 'commercial' | 'open-source'
  tier: 'flagship' | 'mid' | 'light'
  family: string
  variant: string
  tags: string[]
  isOpensource: boolean
  status: 'active' | 'preview' | 'deprecated' | 'scheduled-deprecation'
  deprecationDate: Date | null
  trainingCutoff: Date | null
  languages: string[]
  modalityInput: string[]
  modalityOutput: string[]
  capabilities: {
    functionCalling: boolean
    structuredOutput: boolean
    streaming: boolean
    systemPrompt: boolean
    vision: boolean
    toolUse: boolean
    fineTuning: boolean
    batchApi: boolean
    thinkingMode: boolean
  }
  parameterSize: number | null
  activeParameters: number | null
  architecture: 'dense' | 'moe'
  contextWindow: number
  maxOutput: number
  license: string
  pricing: {
    inputPer1m: number
    outputPer1m: number
    pricingType: string
  }
  compliance: {
    soc2: boolean
    hipaa: boolean
    gdpr: boolean
    onPremise: boolean
    dataExclusion: boolean
  }
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
  avgTps: number | null
  ttftMs: number | null
  regions: string[]
  releaseDate: Date
  memo: string
  sourceUrls: string[]
  openRouterModelId: string | null
  lastVerifiedAt: Date
  isRecentlyReleased: boolean
}

export const ModelSchema = new Schema({
  name:          { type: String, required: true, unique: true },
  slug:          { type: String, required: true, unique: true, index: true },
  providerId:    { type: String, required: true, index: true },
  type:          { type: String, enum: ['commercial', 'open-source'], required: true, index: true },
  tier:          { type: String, enum: ['flagship', 'mid', 'light'], index: true },

  family:        String,
  variant:       String,
  tags:          { type: [String], index: true },
  isOpensource:  { type: Boolean, required: true, index: true },
  status:        { type: String, enum: ['active', 'preview', 'deprecated', 'scheduled-deprecation'], required: true, index: true },
  deprecationDate: Date,
  trainingCutoff:  Date,
  languages:       [String],
  modalityInput:   { type: [String], index: true },
  modalityOutput:  [String],

  capabilities: {
    functionCalling:  { type: Boolean, default: false },
    structuredOutput: { type: Boolean, default: false },
    streaming:        { type: Boolean, default: false },
    systemPrompt:     { type: Boolean, default: false },
    vision:           { type: Boolean, default: false },
    toolUse:          { type: Boolean, default: false },
    fineTuning:       { type: Boolean, default: false },
    batchApi:         { type: Boolean, default: false },
    thinkingMode:     { type: Boolean, default: false },
  },

  parameterSize:    Number,
  activeParameters: Number,
  architecture:     { type: String, enum: ['dense', 'moe'] },
  contextWindow:    Number,
  maxOutput:        Number,
  license:          String,

  pricing: {
    inputPer1m:  Number,
    outputPer1m: Number,
    pricingType: String,
  },

  compliance: {
    soc2:          { type: Boolean, default: false },
    hipaa:         { type: Boolean, default: false },
    gdpr:          { type: Boolean, default: false },
    onPremise:     { type: Boolean, default: false },
    dataExclusion: { type: Boolean, default: false },
  },

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

  avgTps:  Number,
  ttftMs:  Number,
  regions: { type: [String], index: true },

  releaseDate:    { type: Date, required: true },
  memo:           String,
  sourceUrls:     [String],
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

ModelSchema.index({ providerId: 1, type: 1 })
ModelSchema.index({ 'pricing.inputPer1m': 1 })
ModelSchema.index({ releaseDate: -1 })
ModelSchema.index({ name: 'text', providerId: 'text' })
ModelSchema.index({ tags: 1 })
ModelSchema.index({ status: 1 })
ModelSchema.index({ family: 1 })
ModelSchema.index({ isOpensource: 1 })
ModelSchema.index({ 'capabilities.functionCalling': 1 })
ModelSchema.index({ 'capabilities.vision': 1 })
ModelSchema.index({ modalityInput: 1 })
ModelSchema.index({ regions: 1 })

export const ModelModel: Model<IModelDocument> =
  mongoose.models.Model || mongoose.model<IModelDocument>('Model', ModelSchema)
