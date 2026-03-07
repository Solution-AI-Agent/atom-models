export type GpuCategory = 'datacenter' | 'consumer' | 'workstation'

export interface IGpuReference {
  readonly _id?: string
  readonly name: string
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
