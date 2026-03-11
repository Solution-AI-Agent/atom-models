import mongoose, { Schema, Document } from 'mongoose'

export interface IRefBenchmarkDocument extends Document<string> {
  name: string
  displayName: string
  category: string
  maxScore: number
  description: string
  source: string
  url?: string
}

const RefBenchmarkSchema = new Schema<IRefBenchmarkDocument>({
  _id:         { type: String },
  name:        { type: String, required: true },
  displayName: { type: String, required: true },
  category:    { type: String, required: true },
  maxScore:    { type: Number, required: true },
  description: { type: String, required: true },
  source:      { type: String, required: true },
  url:         String,
})

export const RefBenchmarkModel =
  (mongoose.models.RefBenchmark as mongoose.Model<IRefBenchmarkDocument>) ??
  mongoose.model<IRefBenchmarkDocument>('RefBenchmark', RefBenchmarkSchema, 'ref_benchmarks')
