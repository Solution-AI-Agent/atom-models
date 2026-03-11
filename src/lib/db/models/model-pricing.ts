import mongoose, { Schema, Document } from 'mongoose'

export interface IModelPricingDocument extends Document {
  modelId: string
  pricingType: 'api' | 'self-hosted' | 'api-dashscope' | 'api-friendli'
  currency: string
  effectiveFrom: Date
  effectiveTo: Date | null
  inputPer1m: number | null
  outputPer1m: number | null
  cachedInput: number | null
  batchInput: number | null
  batchOutput: number | null
  gpuRequirement: string | null
  costPerHour: number | null
  notes: string | null
}

const ModelPricingSchema = new Schema<IModelPricingDocument>(
  {
    modelId:        { type: String, required: true, index: true },
    pricingType:    { type: String, enum: ['api', 'self-hosted', 'api-dashscope', 'api-friendli'], required: true },
    currency:       { type: String, default: 'USD' },
    effectiveFrom:  { type: Date, required: true },
    effectiveTo:    { type: Date, default: null },
    inputPer1m:     Number,
    outputPer1m:    Number,
    cachedInput:    Number,
    batchInput:     Number,
    batchOutput:    Number,
    gpuRequirement: String,
    costPerHour:    Number,
    notes:          String,
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

ModelPricingSchema.index({ modelId: 1, effectiveFrom: -1 })
ModelPricingSchema.index({ modelId: 1, effectiveTo: 1 })
ModelPricingSchema.index({ pricingType: 1 })

export const ModelPricingModel =
  (mongoose.models.ModelPricing as mongoose.Model<IModelPricingDocument>) ??
  mongoose.model<IModelPricingDocument>('ModelPricing', ModelPricingSchema, 'model_pricing')
