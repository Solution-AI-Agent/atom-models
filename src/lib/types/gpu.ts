export type GpuCategory = 'datacenter' | 'consumer' | 'workstation'

export type QuantizationLevel = 'fp16' | 'fp8' | 'int8' | 'int4' | 'q6_k' | 'q5_k' | 'q4_k_m' | 'q3_k' | 'q2_k'

export interface IGpuReference {
  readonly _id?: string
  readonly name: string
  readonly slug: string
  readonly vendor: string
  readonly vram: number
  readonly memoryType: string
  readonly fp16Tflops: number
  readonly int8Tops: number
  readonly tdp: number
  readonly msrp: number
  readonly cloudHourly: number
  readonly category: GpuCategory
  readonly notes: string
}

export interface ITpsFormula {
  readonly baseTps: number
  readonly refGpuName: string
  readonly refTflops: number
  readonly targetTflops: number
  readonly ratio: number
}

export interface ICompatibleModel {
  readonly name: string
  readonly slug: string
  readonly provider: string
  readonly parameterSize: number | null
  readonly architecture: string
  readonly bestQuantization: QuantizationLevel
  readonly vramRequired: number
  readonly estimatedTps: number
  readonly allQuantizations: readonly {
    readonly level: QuantizationLevel
    readonly vramRequired: number
    readonly fits: boolean
  }[]
  readonly tpsFormula: ITpsFormula | null
}
