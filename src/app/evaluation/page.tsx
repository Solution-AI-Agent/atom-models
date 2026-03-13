import { EvaluationSetup } from '@/components/evaluation/evaluation-setup'

export default function EvaluationPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">LLM 평가</h1>
        <p className="mt-1 text-muted-foreground">
          데이터셋을 업로드하고 여러 모델의 응답 품질을 비교 평가합니다.
        </p>
      </div>

      <EvaluationSetup />
    </div>
  )
}
