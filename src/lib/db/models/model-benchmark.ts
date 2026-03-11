import mongoose, { Schema, Document } from 'mongoose'

export interface IModelBenchmarkDocument extends Document {
  modelId: string
  benchmarkId: string
  score: number
  methodology?: string
  source?: string
  measuredDate?: Date
  notes?: string
}

const ModelBenchmarkSchema = new Schema<IModelBenchmarkDocument>(
  {
    modelId:      { type: String, required: true, index: true },
    benchmarkId:  { type: String, required: true, index: true },
    score:        { type: Number, required: true },
    methodology:  String,
    source:       String,
    measuredDate: Date,
    notes:        String,
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

ModelBenchmarkSchema.index(
  { modelId: 1, benchmarkId: 1, measuredDate: -1 },
  { unique: true },
)
ModelBenchmarkSchema.index({ benchmarkId: 1, score: -1 })

export const ModelBenchmarkModel =
  (mongoose.models.ModelBenchmark as mongoose.Model<IModelBenchmarkDocument>) ??
  mongoose.model<IModelBenchmarkDocument>('ModelBenchmark', ModelBenchmarkSchema, 'model_benchmarks')
