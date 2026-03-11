import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBenchmarkMetaDocument extends Document {
  key: string
  name: string
  displayName: string
  description: string
  source: string
  scoreRange: { min: number; max: number }
  interpretation: string
}

export const BenchmarkMetaSchema = new Schema({
  key:         { type: String, required: true, unique: true, index: true },
  name:        { type: String, required: true },
  displayName: { type: String, required: true },
  description: { type: String, required: true },
  source:      { type: String, required: true },
  scoreRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  interpretation: { type: String, required: true },
}, {
  timestamps: true,
})

export const BenchmarkMetaModel: Model<IBenchmarkMetaDocument> =
  mongoose.models.BenchmarkMeta || mongoose.model<IBenchmarkMetaDocument>('BenchmarkMeta', BenchmarkMetaSchema)
