import { getConnection } from '@/lib/db/connection'
import { BvaPresetModel } from '@/lib/db/models/bva-preset'
import { serialize } from '@/lib/utils/serialize'

export async function getAllPresets() {
  await getConnection()
  const presets = await BvaPresetModel.find().lean()
  return serialize(presets)
}

export async function getPresetsByCategory(categorySlug: string) {
  await getConnection()
  const presets = await BvaPresetModel.find({ categorySlug }).lean()
  return serialize(presets)
}

export async function getPresetCategories() {
  await getConnection()
  const presets = await BvaPresetModel.find().lean()

  const categoryMap = new Map<string, { category: string; categorySlug: string; count: number }>()

  for (const preset of presets) {
    const existing = categoryMap.get(preset.categorySlug)
    if (existing) {
      categoryMap.set(preset.categorySlug, { ...existing, count: existing.count + 1 })
    } else {
      categoryMap.set(preset.categorySlug, {
        category: preset.category,
        categorySlug: preset.categorySlug,
        count: 1,
      })
    }
  }

  return Array.from(categoryMap.values())
}
