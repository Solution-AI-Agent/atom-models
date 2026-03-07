import { getConnection } from '@/lib/db/connection'
import { IndustryPresetModel } from '@/lib/db/models/industry-preset'

export async function getAllPresets() {
  await getConnection()
  return IndustryPresetModel.find().lean()
}

export async function getPresetsByCategory(categorySlug: string) {
  await getConnection()
  return IndustryPresetModel.find({ categorySlug }).lean()
}

export async function getPresetCategories() {
  await getConnection()
  const presets = await IndustryPresetModel.find().lean()

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
