import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBvaPresetDocument extends Document {
  category: string
  categorySlug: string
  taskType: string
  taskTypeSlug: string
  weights: {
    reasoning: number
    korean: number
    coding: number
    knowledge: number
    cost: number
    reliability: number
    toolUse: number
    instruction: number
    longContext: number
  }
  recommendations: {
    commercial: { modelSlug: string; reason: string }[]
    costEffective: { modelSlug: string; reason: string }[]
    openSource: { modelSlug: string; reason: string }[]
  }
  description: string
  keyFactors: string[]
}

export const BvaPresetSchema = new Schema({
  category:     { type: String, required: true, index: true },
  categorySlug: { type: String, required: true, index: true },
  taskType:     { type: String, required: true },
  taskTypeSlug: { type: String, required: true },

  weights: {
    reasoning:   { type: Number, default: 0 },
    korean:      { type: Number, default: 0 },
    coding:      { type: Number, default: 0 },
    knowledge:   { type: Number, default: 0 },
    cost:        { type: Number, default: 0 },
    reliability: { type: Number, default: 0 },
    toolUse:     { type: Number, default: 0 },
    instruction: { type: Number, default: 0 },
    longContext: { type: Number, default: 0 },
  },

  recommendations: {
    commercial:    [{ modelSlug: String, reason: String }],
    costEffective: [{ modelSlug: String, reason: String }],
    openSource:    [{ modelSlug: String, reason: String }],
  },

  description: String,
  keyFactors:  [String],
}, {
  timestamps: true,
})

BvaPresetSchema.index({ categorySlug: 1, taskTypeSlug: 1 }, { unique: true })

export const BvaPresetModel: Model<IBvaPresetDocument> =
  mongoose.models.BvaPreset || mongoose.model<IBvaPresetDocument>('BvaPreset', BvaPresetSchema, 'bva_presets')
