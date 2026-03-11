/**
 * Seed script for atom-models database
 *
 * Usage:
 *   npx tsx scripts/seed.ts          # upsert mode (default)
 *   npx tsx scripts/seed.ts --force   # drop and re-insert
 *
 * Requires MONGODB_URI environment variable.
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { parseModelData, parseGpuData } from '../src/lib/utils/seed-helpers'

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  const forceMode = process.argv.includes('--force')

  console.log(`Connecting to MongoDB...`)
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')
  console.log(`Mode: ${forceMode ? 'FORCE (drop + insert)' : 'UPSERT'}`)

  const { ModelModel } = await import('../src/lib/db/models/model')
  const { IndustryPresetModel } = await import(
    '../src/lib/db/models/industry-preset'
  )
  const { GpuReferenceModel } = await import(
    '../src/lib/db/models/gpu-reference'
  )
  const { PriceHistoryModel } = await import(
    '../src/lib/db/models/price-history'
  )
  const { BenchmarkMetaModel } = await import(
    '../src/lib/db/models/benchmark-meta'
  )
  const { BvaDimensionModel } = await import(
    '../src/lib/db/models/bva-dimension'
  )

  const dataDir = path.resolve(__dirname, '..', 'data')

  // --- Models ---
  const modelsRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'models.json'), 'utf-8'),
  ) as Record<string, unknown>[]
  const models = modelsRaw.map(parseModelData)

  if (forceMode) {
    await ModelModel.deleteMany({})
  }

  let modelCount = 0
  for (const model of models) {
    await ModelModel.updateOne({ slug: (model as any).slug }, model as any, { upsert: true })
    modelCount++
  }
  console.log(`Models: ${modelCount} upserted`)

  // --- Industry Presets ---
  const presetsRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'industry-presets.json'), 'utf-8'),
  ) as Record<string, unknown>[]

  if (forceMode) {
    await IndustryPresetModel.deleteMany({})
  }

  let presetCount = 0
  for (const preset of presetsRaw) {
    await IndustryPresetModel.updateOne(
      {
        categorySlug: (preset as any).categorySlug,
        taskTypeSlug: (preset as any).taskTypeSlug,
      },
      preset as any,
      { upsert: true },
    )
    presetCount++
  }
  console.log(`Industry Presets: ${presetCount} upserted`)

  // --- GPU Reference ---
  const gpusRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'gpu-reference.json'), 'utf-8'),
  ) as Record<string, unknown>[]
  const gpus = gpusRaw.map(parseGpuData)

  if (forceMode) {
    await GpuReferenceModel.deleteMany({})
  }

  let gpuCount = 0
  for (const gpu of gpus) {
    await GpuReferenceModel.updateOne({ name: (gpu as any).name }, gpu as any, { upsert: true })
    gpuCount++
  }
  console.log(`GPUs: ${gpuCount} upserted`)

  // --- Benchmark Meta ---
  const benchmarkMetaRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'benchmark-meta.json'), 'utf-8'),
  ) as Record<string, unknown>[]

  if (forceMode) {
    await BenchmarkMetaModel.deleteMany({})
  }

  let benchmarkMetaCount = 0
  for (const meta of benchmarkMetaRaw) {
    await BenchmarkMetaModel.updateOne(
      { key: (meta as any).key },
      meta as any,
      { upsert: true },
    )
    benchmarkMetaCount++
  }
  console.log(`Benchmark Meta: ${benchmarkMetaCount} upserted`)

  // --- BVA Dimensions ---
  const bvaDimensionsRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'bva-dimensions.json'), 'utf-8'),
  ) as Record<string, unknown>[]

  if (forceMode) {
    await BvaDimensionModel.deleteMany({})
  }

  let bvaDimensionCount = 0
  for (const dim of bvaDimensionsRaw) {
    await BvaDimensionModel.updateOne(
      { key: (dim as any).key },
      dim as any,
      { upsert: true },
    )
    bvaDimensionCount++
  }
  console.log(`BVA Dimensions: ${bvaDimensionCount} upserted`)

  // --- Price History (initial records) ---
  const existingModels = await ModelModel.find().lean()
  let priceCount = 0

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  for (const model of existingModels) {
    const pricing = model.pricing as
      | { input: number; output: number }
      | undefined
    if (pricing) {
      await PriceHistoryModel.updateOne(
        {
          modelSlug: model.slug,
          recordedAt: { $gte: todayStart },
        },
        {
          modelId: model._id,
          modelSlug: model.slug,
          inputPrice: pricing.input,
          outputPrice: pricing.output,
          recordedAt: new Date(),
        },
        { upsert: true },
      )
      priceCount++
    }
  }
  console.log(`Price History: ${priceCount} initial records created`)

  // --- Summary ---
  console.log('\n--- Seed Summary ---')
  console.log(`Models:           ${modelCount}`)
  console.log(`Industry Presets: ${presetCount}`)
  console.log(`GPUs:             ${gpuCount}`)
  console.log(`Benchmark Meta:   ${benchmarkMetaCount}`)
  console.log(`BVA Dimensions:   ${bvaDimensionCount}`)
  console.log(`Price History:    ${priceCount}`)
  console.log('-------------------')

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB. Seed complete.')
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
