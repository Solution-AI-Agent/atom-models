import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IRefGpuDocument extends Document {
  name: string
  slug: string
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

const RefGpuSchema = new Schema({
  name:         { type: String, required: true, unique: true },
  slug:         { type: String, required: true, unique: true },
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

export const RefGpuModel: Model<IRefGpuDocument> =
  mongoose.models.RefGpu || mongoose.model<IRefGpuDocument>('RefGpu', RefGpuSchema, 'ref_gpus')
