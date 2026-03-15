'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/use-debounce'
import { SimulatorModelSelector } from './model-selector'
import { CommonInputs } from './common-inputs'
import { ApiCostTab } from './api-cost-tab'
import { BreakevenTab } from './breakeven-tab'
import { RoutingTab } from './routing-tab'
import type { IModel } from '@/lib/types/model'
import type { ISimulatorInputs, IApiCostInputs } from '@/lib/types/simulator'

const DEFAULT_INPUTS: ISimulatorInputs = {
  dailyRequests: 1000,
  avgInputTokens: 500,
  avgOutputTokens: 300,
  monthlyDays: 30,
}

const DEFAULT_API_INPUTS: IApiCostInputs = {
  cacheRate: 0,
  batchRate: 0,
}

export function SimulatorClient() {
  const [models, setModels] = useState<readonly IModel[]>([])
  const [inputs, setInputs] = useState<ISimulatorInputs>(DEFAULT_INPUTS)
  const [apiInputs, setApiInputs] = useState<IApiCostInputs>(DEFAULT_API_INPUTS)
  const [ratios, setRatios] = useState<readonly number[]>([])

  // Debounce inputs for 300ms to avoid excessive recalculation
  const debouncedInputs = useDebounce(inputs, 300)
  const debouncedApiInputs = useDebounce(apiInputs, 300)

  const handleModelsChange = useCallback((newModels: readonly IModel[]) => {
    setModels(newModels)
    // Initialize equal ratios, give remainder to first model
    const count = newModels.length
    if (count > 0) {
      const base = Math.round((1 / count) * 100) / 100
      const remainder = Math.round((1 - base * count) * 100) / 100
      setRatios(newModels.map((_, i) => i === 0 ? base + remainder : base))
    } else {
      setRatios([])
    }
  }, [])

  return (
    <div className="space-y-6">
      <SimulatorModelSelector selectedModels={models} onModelsChange={handleModelsChange} />
      <CommonInputs inputs={inputs} onChange={setInputs} />

      {models.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          모델을 선택하면 비용 시뮬레이션을 시작할 수 있습니다.
        </div>
      ) : (
        <Tabs defaultValue="api-cost">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-cost">API 비용</TabsTrigger>
            <TabsTrigger value="breakeven">손익분기점</TabsTrigger>
            <TabsTrigger value="routing">라우팅</TabsTrigger>
          </TabsList>
          <TabsContent value="api-cost" className="mt-6">
            <ApiCostTab
              models={models}
              inputs={debouncedInputs}
              apiInputs={apiInputs}
              onApiInputsChange={setApiInputs}
            />
          </TabsContent>
          <TabsContent value="breakeven" className="mt-6">
            <BreakevenTab
              models={models}
              inputs={debouncedInputs}
              apiInputs={debouncedApiInputs}
            />
          </TabsContent>
          <TabsContent value="routing" className="mt-6">
            <RoutingTab
              models={models}
              inputs={debouncedInputs}
              apiInputs={debouncedApiInputs}
              ratios={ratios}
              onRatiosChange={setRatios}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
