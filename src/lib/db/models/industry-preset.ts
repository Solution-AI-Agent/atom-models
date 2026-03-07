import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IIndustryPresetDocument extends Document {
  category: string
  categorySlug: string
  taskType: string
  taskTypeSlug: string
  weights: {
    quality: number
    speed: number
    reasoning: number
    coding: number
    multimodal: number
    cost: number
    korean: number
  }
  recommendations: {
    commercial: { modelSlug: string; reason: string }[]
    costEffective: { modelSlug: string; reason: string }[]
    openSource: { modelSlug: string; reason: string }[]
  }
  description: string
  keyFactors: string[]
}

export const IndustryPresetSchema = new Schema({
  category:     { type: String, required: true, index: true },
  categorySlug: { type: String, required: true, index: true },
  taskType:     { type: String, required: true },
  taskTypeSlug: { type: String, required: true },

  weights: {
    quality:    { type: Number, default: 0 },
    speed:      { type: Number, default: 0 },
    reasoning:  { type: Number, default: 0 },
    coding:     { type: Number, default: 0 },
    multimodal: { type: Number, default: 0 },
    cost:       { type: Number, default: 0 },
    korean:     { type: Number, default: 0 },
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

IndustryPresetSchema.index({ categorySlug: 1, taskTypeSlug: 1 }, { unique: true })

export const IndustryPresetModel: Model<IIndustryPresetDocument> =
  mongoose.models.IndustryPreset || mongoose.model<IIndustryPresetDocument>('IndustryPreset', IndustryPresetSchema)
