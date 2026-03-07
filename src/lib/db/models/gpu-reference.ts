import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IGpuReferenceDocument extends Document {
  name: string
  vendor: string
  vram: number
  memoryType: string
  fp16Tflops: number
  int8Tops: number
  tdp: number
  msrp: number
  cloudHourly: number
  category: 'datacenter' | 'consumer' | 'workstation'
  notes: string
}

const GpuReferenceSchema = new Schema({
  name:         { type: String, required: true, unique: true },
  vendor:       String,
  vram:         Number,
  memoryType:   String,
  fp16Tflops:   Number,
  int8Tops:     Number,
  tdp:          Number,
  msrp:         Number,
  cloudHourly:  Number,
  category:     { type: String, enum: ['datacenter', 'consumer', 'workstation'] },
  notes:        String,
}, {
  timestamps: true,
})

export const GpuReferenceModel: Model<IGpuReferenceDocument> =
  mongoose.models.GpuReference || mongoose.model<IGpuReferenceDocument>('GpuReference', GpuReferenceSchema)
