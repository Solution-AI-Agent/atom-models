export type ProviderType = 'commercial' | 'commercial+oss' | 'oss'

export interface IProvider {
  readonly _id: string
  readonly name: string
  readonly nameEn: string
  readonly type: ProviderType
  readonly headquarters?: string
  readonly founded?: number
  readonly website?: string
  readonly apiEndpoint?: string
  readonly description?: string
  readonly colorCode: string
}
