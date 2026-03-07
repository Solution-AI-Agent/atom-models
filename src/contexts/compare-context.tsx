'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

const MAX_COMPARE = 4

interface CompareContextValue {
  readonly models: readonly string[]
  readonly addModel: (slug: string) => void
  readonly removeModel: (slug: string) => void
  readonly isComparing: (slug: string) => boolean
  readonly clearAll: () => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { readonly children: ReactNode }) {
  const [models, setModels] = useState<string[]>([])

  const addModel = useCallback((slug: string) => {
    setModels((prev) => {
      if (prev.includes(slug) || prev.length >= MAX_COMPARE) return prev
      return [...prev, slug]
    })
  }, [])

  const removeModel = useCallback((slug: string) => {
    setModels((prev) => prev.filter((s) => s !== slug))
  }, [])

  const isComparing = useCallback(
    (slug: string) => models.includes(slug),
    [models],
  )

  const clearAll = useCallback(() => {
    setModels([])
  }, [])

  return (
    <CompareContext.Provider value={{ models, addModel, removeModel, isComparing, clearAll }}>
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext)
  if (!context) throw new Error('useCompare must be used within CompareProvider')
  return context
}
