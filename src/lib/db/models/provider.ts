import mongoose, { Schema, Document } from 'mongoose'

export interface IProviderDocument extends Document<string> {
  name: string
  nameEn: string
  type: 'commercial' | 'commercial+oss' | 'oss'
  headquarters?: string
  founded?: number
  website?: string
  apiEndpoint?: string
  description?: string
  colorCode: string
}

const ProviderSchema = new Schema<IProviderDocument>(
  {
    _id:          { type: String },
    name:         { type: String, required: true },
    nameEn:       { type: String, required: true },
    type:         { type: String, enum: ['commercial', 'commercial+oss', 'oss'], required: true },
    headquarters: String,
    founded:      Number,
    website:      String,
    apiEndpoint:  String,
    description:  String,
    colorCode:    { type: String, required: true },
  },
  { timestamps: true },
)

export const ProviderModel =
  (mongoose.models.Provider as mongoose.Model<IProviderDocument>) ??
  mongoose.model<IProviderDocument>('Provider', ProviderSchema, 'providers')
