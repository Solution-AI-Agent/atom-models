import { getConnection } from '@/lib/db/connection'
import { ProviderModel } from '@/lib/db/models/provider'
import { serialize } from '@/lib/utils/serialize'
import type { IProvider } from '@/lib/types/provider'

export async function getProviders(): Promise<readonly IProvider[]> {
  await getConnection()
  const providers = await ProviderModel.find().lean()
  return serialize(providers)
}

export async function getProviderById(id: string): Promise<IProvider | null> {
  await getConnection()
  const provider = await ProviderModel.findById(id).lean()
  return provider ? serialize(provider) : null
}

export async function getProviderMap(): Promise<ReadonlyMap<string, IProvider>> {
  const providers = await getProviders()
  return new Map(providers.map(p => [p._id, p]))
}
