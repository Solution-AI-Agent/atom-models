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

  const { ProviderModel } = await import('../src/lib/db/models/provider')
  const { ModelModel } = await import('../src/lib/db/models/model')
  const { ModelBenchmarkModel } = await import('../src/lib/db/models/model-benchmark')
  const { ModelPricingModel } = await import('../src/lib/db/models/model-pricing')
  const { RefBenchmarkModel } = await import('../src/lib/db/models/ref-benchmark')
  const { RefGpuModel } = await import('../src/lib/db/models/ref-gpu')
  const { BvaDimensionModel } = await import('../src/lib/db/models/bva-dimension')
  const { BvaPresetModel } = await import('../src/lib/db/models/bva-preset')

  const dataDir = path.resolve(__dirname, '..', 'data')

  function loadJson(filename: string) {
    const filepath = path.join(dataDir, filename)
    if (!fs.existsSync(filepath)) {
      console.log(`  SKIP: ${filename} not found`)
      return null
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
  }

  // --- 1. Providers ---
  const providersRaw = loadJson('providers.json')
  let providerCount = 0
  if (providersRaw) {
    if (forceMode) await ProviderModel.deleteMany({})
    for (const p of providersRaw) {
      await ProviderModel.updateOne({ _id: p._id }, p, { upsert: true })
      providerCount++
    }
    console.log(`Providers: ${providerCount} upserted`)
  }

  // --- 2. Ref Benchmarks ---
  const refBenchmarksRaw = loadJson('ref-benchmarks.json')
  let refBenchmarkCount = 0
  if (refBenchmarksRaw) {
    if (forceMode) await RefBenchmarkModel.deleteMany({})
    for (const b of refBenchmarksRaw) {
      await RefBenchmarkModel.updateOne({ _id: b._id }, b, { upsert: true })
      refBenchmarkCount++
    }
    console.log(`Ref Benchmarks: ${refBenchmarkCount} upserted`)
  }

  // --- 3. Ref GPUs ---
  const gpusRaw = loadJson('gpu-reference.json')
  let gpuCount = 0
  if (gpusRaw) {
    const gpus = gpusRaw.map(parseGpuData)
    if (forceMode) await RefGpuModel.deleteMany({})
    for (const gpu of gpus) {
      await RefGpuModel.updateOne({ name: (gpu as any).name }, gpu as any, { upsert: true })
      gpuCount++
    }
    console.log(`Ref GPUs: ${gpuCount} upserted`)
  }

  // --- 4. Models ---
  const modelsRaw = loadJson('models.json')
  let modelCount = 0
  if (modelsRaw) {
    const models = (modelsRaw as Record<string, unknown>[]).map(parseModelData)
    if (forceMode) await ModelModel.deleteMany({})
    for (const model of models) {
      await ModelModel.updateOne({ slug: (model as any).slug }, model as any, { upsert: true })
      modelCount++
    }
    console.log(`Models: ${modelCount} upserted`)
  }

  // --- 5. Model Benchmarks (long format) ---
  const modelBenchmarksRaw = loadJson('model-benchmarks.json')
  let modelBenchmarkCount = 0
  if (modelBenchmarksRaw) {
    if (forceMode) await ModelBenchmarkModel.deleteMany({})
    for (const bm of modelBenchmarksRaw) {
      await ModelBenchmarkModel.updateOne(
        {
          modelId: bm.modelId,
          benchmarkId: bm.benchmarkId,
          measuredDate: bm.measuredDate ? new Date(bm.measuredDate) : new Date(),
        },
        {
          ...bm,
          measuredDate: bm.measuredDate ? new Date(bm.measuredDate) : new Date(),
        },
        { upsert: true },
      )
      modelBenchmarkCount++
    }
    console.log(`Model Benchmarks: ${modelBenchmarkCount} upserted`)
  }

  // --- 6. Model Pricing ---
  const modelPricingRaw = loadJson('model-pricing.json')
  let modelPricingCount = 0
  if (modelPricingRaw) {
    if (forceMode) await ModelPricingModel.deleteMany({})
    for (const pricing of modelPricingRaw) {
      await ModelPricingModel.updateOne(
        {
          modelId: pricing.modelId,
          effectiveFrom: new Date(pricing.effectiveFrom),
        },
        {
          ...pricing,
          effectiveFrom: new Date(pricing.effectiveFrom),
          effectiveTo: pricing.effectiveTo ? new Date(pricing.effectiveTo) : null,
        },
        { upsert: true },
      )
      modelPricingCount++
    }
    console.log(`Model Pricing: ${modelPricingCount} upserted`)
  }

  // --- 7. Benchmark Cache Sync ---
  if (modelBenchmarksRaw && modelsRaw) {
    const allModels = await ModelModel.find().lean()
    let cacheCount = 0
    for (const model of allModels) {
      const benchmarks = await ModelBenchmarkModel.find({ modelId: model.slug })
        .sort({ measuredDate: -1 })
        .lean()

      const cache: Record<string, number> = {}
      for (const bm of benchmarks) {
        if (!cache[bm.benchmarkId]) {
          cache[bm.benchmarkId] = bm.score
        }
      }

      if (Object.keys(cache).length > 0) {
        await ModelModel.updateOne(
          { slug: model.slug },
          { $set: { benchmarks: cache } },
        )
        cacheCount++
      }
    }
    console.log(`Benchmark Cache: ${cacheCount} synced`)
  }

  // --- 8. Pricing Cache Sync ---
  if (modelPricingRaw && modelsRaw) {
    const allModels = await ModelModel.find().lean()
    let priceCacheCount = 0
    for (const model of allModels) {
      const currentPrice = await ModelPricingModel.findOne({
        modelId: model.slug,
        effectiveTo: null,
      }).lean()

      if (currentPrice) {
        await ModelModel.updateOne(
          { slug: model.slug },
          {
            $set: {
              'pricing.inputPer1m': currentPrice.inputPer1m,
              'pricing.outputPer1m': currentPrice.outputPer1m,
              'pricing.pricingType': currentPrice.pricingType,
            },
          },
        )
        priceCacheCount++
      }
    }
    console.log(`Pricing Cache: ${priceCacheCount} synced`)
  }

  // --- 9. BVA Dimensions ---
  const bvaDimensionsRaw = loadJson('bva-dimensions.json')
  let bvaDimensionCount = 0
  if (bvaDimensionsRaw) {
    if (forceMode) await BvaDimensionModel.deleteMany({})
    for (const dim of bvaDimensionsRaw) {
      await BvaDimensionModel.updateOne(
        { key: dim.key },
        dim,
        { upsert: true },
      )
      bvaDimensionCount++
    }
    console.log(`BVA Dimensions: ${bvaDimensionCount} upserted`)
  }

  // --- 10. BVA Presets ---
  const presetsRaw = loadJson('bva-presets.json') || loadJson('industry-presets.json')
  let presetCount = 0
  if (presetsRaw) {
    if (forceMode) await BvaPresetModel.deleteMany({})
    for (const preset of presetsRaw) {
      await BvaPresetModel.updateOne(
        {
          categorySlug: preset.categorySlug,
          taskTypeSlug: preset.taskTypeSlug,
        },
        preset,
        { upsert: true },
      )
      presetCount++
    }
    console.log(`BVA Presets: ${presetCount} upserted`)
  }

  // --- Summary ---
  console.log('\n--- Seed Summary ---')
  console.log(`Providers:        ${providerCount}`)
  console.log(`Ref Benchmarks:   ${refBenchmarkCount}`)
  console.log(`Ref GPUs:         ${gpuCount}`)
  console.log(`Models:           ${modelCount}`)
  console.log(`Model Benchmarks: ${modelBenchmarkCount}`)
  console.log(`Model Pricing:    ${modelPricingCount}`)
  console.log(`BVA Dimensions:   ${bvaDimensionCount}`)
  console.log(`BVA Presets:      ${presetCount}`)
  console.log('-------------------')

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB. Seed complete.')
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
