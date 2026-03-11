'use client'

import { useState, useMemo } from 'react'
import { PlaygroundHeader } from '@/components/playground/playground-header'
import { PlaygroundSetup } from '@/components/playground/playground-setup'
import { ChatColumn } from '@/components/playground/chat-column'
import { ChatInput } from '@/components/playground/chat-input'
import { useStreamingChat } from '@/hooks/use-streaming-chat'
import { DEFAULT_PARAMETERS } from '@/lib/types/playground'
import type { IModel } from '@/lib/types/model'
import type {
  IPlaygroundMessage,
  IPlaygroundModelConfig,
  IPlaygroundParameters,
} from '@/lib/types/playground'

const EMPTY_PRICING = { input: 0, output: 0 } as const

function makeStreamOptions(
  model: IModel | undefined,
  params: IPlaygroundParameters,
) {
  if (!model) {
    return {
      modelId: '',
      openRouterModelId: '',
      parameters: DEFAULT_PARAMETERS,
      pricing: EMPTY_PRICING,
    }
  }
  return {
    modelId: model._id || '',
    openRouterModelId: model.openRouterModelId || '',
    parameters: params,
    pricing: model.pricing,
  }
}

export default function PlaygroundPage() {
  const [selectedModels, setSelectedModels] = useState<readonly IModel[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [defaultParameters, setDefaultParameters] =
    useState<IPlaygroundParameters>(DEFAULT_PARAMETERS)
  const [modelParameters, setModelParameters] = useState<
    Record<string, IPlaygroundParameters>
  >({})
  const [messages, setMessages] = useState<readonly IPlaygroundMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [setupCollapsed, setSetupCollapsed] = useState(false)

  const paramsFor = (m: IModel | undefined) =>
    m ? modelParameters[m._id!] || defaultParameters : DEFAULT_PARAMETERS

  // Always call 3 hooks unconditionally (React rules of hooks)
  const stream0 = useStreamingChat(
    makeStreamOptions(selectedModels[0], paramsFor(selectedModels[0])),
  )
  const stream1 = useStreamingChat(
    makeStreamOptions(selectedModels[1], paramsFor(selectedModels[1])),
  )
  const stream2 = useStreamingChat(
    makeStreamOptions(selectedModels[2], paramsFor(selectedModels[2])),
  )
  const streams = [stream0, stream1, stream2]

  const anyStreaming = selectedModels.some((_, i) => streams[i].isStreaming)

  const fastestMetrics = useMemo(() => {
    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return undefined

    const assistantMsgs = messages
      .slice(lastUserIdx + 1)
      .filter((m) => m.role === 'assistant' && m.metrics)

    if (assistantMsgs.length < 2) return undefined

    let fastestTtft: string | null = null
    let lowestTtft = Infinity
    let fastestTps: string | null = null
    let highestTps = -Infinity

    for (const msg of assistantMsgs) {
      if (msg.metrics!.ttft < lowestTtft) {
        lowestTtft = msg.metrics!.ttft
        fastestTtft = msg.modelId || null
      }
      if (msg.metrics!.tps > highestTps) {
        highestTps = msg.metrics!.tps
        fastestTps = msg.modelId || null
      }
    }

    return { ttft: fastestTtft, tps: fastestTps }
  }, [messages])

  function buildMessageHistory(modelId: string, newMessage: string) {
    const history: {
      role: 'system' | 'user' | 'assistant'
      content: string
    }[] = []

    if (systemPrompt) {
      history.push({ role: 'system', content: systemPrompt })
    }

    for (const msg of messages) {
      if (msg.role === 'user') {
        history.push({ role: 'user', content: msg.content })
      } else if (msg.modelId === modelId) {
        history.push({ role: 'assistant', content: msg.content })
      }
    }

    history.push({ role: 'user', content: newMessage })
    return history
  }

  async function handleSend(message: string) {
    if (selectedModels.length === 0) return

    const userMsg: IPlaygroundMessage = { role: 'user', content: message }
    setMessages((prev) => [...prev, userMsg])
    setSetupCollapsed(true)

    // Create session if needed
    let currentSessionId = sessionId
    if (!currentSessionId) {
      try {
        const res = await fetch('/api/playground/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: message.slice(0, 50),
            models: selectedModels.map((m) => ({
              modelId: m._id,
              modelName: m.name,
              provider: m.provider,
              openRouterModelId: m.openRouterModelId,
              colorCode: m.colorCode,
              parameters: modelParameters[m._id!] || defaultParameters,
            })),
            systemPrompt,
            defaultParameters,
          }),
        })
        const json = await res.json()
        if (json.success) {
          currentSessionId = json.data._id
          setSessionId(currentSessionId)
        }
      } catch {
        // Continue without session persistence
      }
    }

    // Send to all models in parallel, add results as each completes
    const promises = selectedModels.map(async (model, i) => {
      const history = buildMessageHistory(model._id!, message)
      const result = await streams[i].sendMessage(history)
      if (result) {
        setMessages((prev) => [...prev, result])
      }
      return result
    })

    const results = await Promise.allSettled(promises)

    // Save messages to session after all complete
    const completedMsgs = results
      .filter(
        (r): r is PromiseFulfilledResult<IPlaygroundMessage | null> =>
          r.status === 'fulfilled' && r.value !== null,
      )
      .map((r) => r.value!)

    if (currentSessionId && completedMsgs.length > 0) {
      try {
        await fetch(`/api/playground/sessions/${currentSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [userMsg, ...completedMsgs],
          }),
        })
      } catch {
        // Ignore save errors
      }
    }
  }

  function handleNewSession() {
    setSessionId(null)
    setSelectedModels([])
    setSystemPrompt('')
    setDefaultParameters(DEFAULT_PARAMETERS)
    setModelParameters({})
    setMessages([])
    setSetupCollapsed(false)
  }

  async function handleSelectSession(id: string) {
    try {
      const res = await fetch(`/api/playground/sessions/${id}`)
      const json = await res.json()
      if (!json.success) return

      const session = json.data
      setSessionId(id)
      setMessages(session.messages || [])
      setSystemPrompt(session.systemPrompt || '')
      setDefaultParameters(session.defaultParameters || DEFAULT_PARAMETERS)
      setSetupCollapsed(true)

      // Restore full model objects from API
      const modelRes = await fetch('/api/models?limit=200')
      const modelJson = await modelRes.json()
      if (modelJson.success) {
        const modelMap = new Map<string, IModel>(
          modelJson.data.map((m: IModel) => [m._id, m]),
        )
        const restored = (session.models as IPlaygroundModelConfig[])
          .map((mc) => modelMap.get(mc.modelId))
          .filter(Boolean) as IModel[]
        setSelectedModels(restored)

        const params: Record<string, IPlaygroundParameters> = {}
        for (const mc of session.models as IPlaygroundModelConfig[]) {
          if (mc.parameters) {
            params[mc.modelId] = mc.parameters
          }
        }
        setModelParameters(params)
      }
    } catch {
      // Ignore load errors
    }
  }

  function getMessagesForModel(modelId: string) {
    return messages.filter(
      (m) => m.role === 'user' || m.modelId === modelId,
    )
  }

  const gridColsClass =
    selectedModels.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : selectedModels.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1'

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
      <PlaygroundHeader
        currentSessionId={sessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
      />

      <PlaygroundSetup
        selectedModels={selectedModels}
        onModelsChange={setSelectedModels}
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        defaultParameters={defaultParameters}
        onDefaultParametersChange={setDefaultParameters}
        collapsed={setupCollapsed}
        onToggleCollapse={() => setSetupCollapsed((prev) => !prev)}
        disabled={messages.length > 0}
      />

      {selectedModels.length > 0 ? (
        <div
          className={`grid flex-1 gap-4 overflow-y-auto md:overflow-hidden p-4 ${gridColsClass}`}
        >
          {selectedModels.map((model, i) => (
            <ChatColumn
              key={model._id}
              className="min-h-[300px] md:min-h-0"
              modelName={model.name}
              provider={model.provider}
              colorCode={model.colorCode}
              messages={getMessagesForModel(model._id!)}
              streamingContent={streams[i].content}
              streamingReasoning={streams[i].reasoning}
              isStreaming={streams[i].isStreaming}
              error={streams[i].error}
              parameters={modelParameters[model._id!] || defaultParameters}
              onParametersChange={(params) =>
                setModelParameters((prev) => ({
                  ...prev,
                  [model._id!]: params,
                }))
              }
              onStop={streams[i].stop}
              fastestMetrics={fastestMetrics}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">
            모델을 선택하면 대화를 시작할 수 있습니다.
          </p>
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        disabled={anyStreaming || selectedModels.length === 0}
      />
    </div>
  )
}
