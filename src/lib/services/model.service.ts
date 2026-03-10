import { getConnection } from '@/lib/db/connection'
import { ModelModel } from '@/lib/db/models/model'
import { serialize } from '@/lib/utils/serialize'
import { BENCHMARKS } from '@/lib/constants/benchmarks'
import type { IModelListQuery } from '@/lib/types/model'

const ALLOWED_SORT_FIELDS = new Set([
  'name',
  'provider',
  'pricing.output',
  'contextWindow',
  ...Object.keys(BENCHMARKS).map((key) => `benchmarks.${key}`),
])

export interface ModelListResult {
  readonly models: readonly any[]
  readonly total: number
  readonly page: number
  readonly limit: number
}

export async function getModels(query: IModelListQuery): Promise<ModelListResult> {
  await getConnection()

  const filter: Record<string, any> = {}

  if (query.type) {
    filter.type = query.type
  }
  if (query.provider) {
    filter.provider = { $in: query.provider.split(',') }
  }
  if (query.tier) {
    filter.tier = { $in: query.tier.split(',') }
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter['pricing.output'] = {}
    if (query.minPrice !== undefined) filter['pricing.output'].$gte = query.minPrice
    if (query.maxPrice !== undefined) filter['pricing.output'].$lte = query.maxPrice
  }
  if (query.search) {
    filter.$text = { $search: query.search }
  }

  const page = query.page || 1
  const limit = query.limit || 50
  const sortField = query.sort && ALLOWED_SORT_FIELDS.has(query.sort) ? query.sort : 'name'
  const sortOrder = query.order === 'desc' ? -1 : 1

  const [models, total] = await Promise.all([
    ModelModel
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ModelModel.countDocuments(filter),
  ])

  return { models: serialize(models), total, page, limit }
}

export async function getModelBySlug(slug: string) {
  await getConnection()
  const model = await ModelModel.findOne({ slug }).lean()
  return model ? serialize(model) : null
}

export async function getSimilarModels(slug: string, limitCount = 4) {
  await getConnection()
  const model = await ModelModel.findOne({ slug }).lean()
  if (!model) return []

  const similar = await ModelModel
    .find({
      slug: { $ne: slug },
      $or: [
        { tier: model.tier },
        { provider: model.provider },
      ],
    })
    .limit(limitCount)
    .lean()
  return serialize(similar)
}

export async function getNewModels(limitCount = 6) {
  await getConnection()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const models = await ModelModel
    .find({ releaseDate: { $gte: thirtyDaysAgo } })
    .sort({ releaseDate: -1 })
    .limit(limitCount)
    .lean()
  return serialize(models)
}

export async function getModelCount() {
  await getConnection()
  return ModelModel.countDocuments()
}
