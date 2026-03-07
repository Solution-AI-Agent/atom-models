import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPriceHistoryDocument extends Document {
  modelId: mongoose.Types.ObjectId
  modelSlug: string
  inputPrice: number
  outputPrice: number
  recordedAt: Date
}

const PriceHistorySchema = new Schema({
  modelId:     { type: Schema.Types.ObjectId, ref: 'Model', required: true, index: true },
  modelSlug:   { type: String, required: true, index: true },
  inputPrice:  { type: Number, required: true },
  outputPrice: { type: Number, required: true },
  recordedAt:  { type: Date, required: true, default: Date.now },
}, {
  timestamps: true,
})

PriceHistorySchema.index({ modelId: 1, recordedAt: -1 })

export const PriceHistoryModel: Model<IPriceHistoryDocument> =
  mongoose.models.PriceHistory || mongoose.model<IPriceHistoryDocument>('PriceHistory', PriceHistorySchema)
