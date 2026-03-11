import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBvaDimensionDocument extends Document {
  key: string
  displayName: string
  description: string
  formula: { benchmark: string; weight: number }[]
  formulaExplanation: string
}

export const BvaDimensionSchema = new Schema({
  key:         { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  description: { type: String, required: true },
  formula: [{
    benchmark: { type: String, required: true },
    weight:    { type: Number, required: true },
  }],
  formulaExplanation: { type: String, required: true },
}, {
  timestamps: true,
})

export const BvaDimensionModel: Model<IBvaDimensionDocument> =
  mongoose.models.BvaDimension || mongoose.model<IBvaDimensionDocument>('BvaDimension', BvaDimensionSchema, 'bva_dimensions')
