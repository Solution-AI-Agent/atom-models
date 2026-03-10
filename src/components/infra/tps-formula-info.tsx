interface TpsFormulaProps {
  readonly baseTps: number
  readonly refGpuName: string
  readonly refTflops: number
  readonly targetTflops: number
  readonly ratio: number
}

interface TpsFormulaInfoProps {
  readonly formula?: TpsFormulaProps
}

export function TpsFormulaInfo({ formula }: TpsFormulaInfoProps) {
  return (
    <div className="rounded-lg border bg-muted/50 p-3 text-sm">
      <p className="font-medium">
        TPS = baseTPS × (대상 GPU TFLOPS / 기준 GPU TFLOPS)
      </p>
      {formula ? (
        <div className="mt-2 space-y-1 text-muted-foreground">
          <p>기준 GPU: {formula.refGpuName} ({formula.refTflops} TFLOPS)</p>
          <p>대상 GPU: {formula.targetTflops} TFLOPS</p>
          <p>기준 TPS: {formula.baseTps} tokens/s</p>
          <p>비율: {formula.ratio.toFixed(3)}</p>
        </div>
      ) : (
        <p className="mt-1 text-muted-foreground">
          기준 GPU 대비 TFLOPS 비율로 추정 TPS를 계산합니다.
        </p>
      )}
    </div>
  )
}
