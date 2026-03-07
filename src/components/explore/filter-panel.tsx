'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MODEL_TIERS } from '@/lib/constants/tiers'
import { PROVIDERS } from '@/lib/constants/providers'
import { XIcon } from 'lucide-react'

type ModelType = 'commercial' | 'open-source'

export function FilterPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentType = searchParams.get('type') as ModelType | null
  const currentProviders = searchParams.get('provider')?.split(',') ?? []
  const currentTiers = searchParams.get('tier')?.split(',') ?? []

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/explore?${params.toString()}`)
    },
    [router, searchParams],
  )

  const toggleArrayParam = useCallback(
    (key: string, value: string) => {
      const current = searchParams.get(key)?.split(',').filter(Boolean) ?? []
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      updateParam(key, updated.length > 0 ? updated.join(',') : null)
    },
    [searchParams, updateParam],
  )

  const clearAll = useCallback(() => {
    router.push('/explore')
  }, [router])

  const hasFilters = currentType || currentProviders.length > 0 || currentTiers.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">유형:</span>
        <Button
          variant={currentType === 'commercial' ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateParam('type', currentType === 'commercial' ? null : 'commercial')}
        >
          Commercial
        </Button>
        <Button
          variant={currentType === 'open-source' ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateParam('type', currentType === 'open-source' ? null : 'open-source')}
        >
          Open Source
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">제공사:</span>
        {PROVIDERS.map((provider) => (
          <Button
            key={provider}
            variant={currentProviders.includes(provider) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleArrayParam('provider', provider)}
          >
            {provider}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">티어:</span>
        {Object.entries(MODEL_TIERS).map(([key, tier]) => (
          <Button
            key={key}
            variant={currentTiers.includes(key) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleArrayParam('tier', key)}
          >
            {tier.label}
          </Button>
        ))}
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            필터 적용됨
            <button onClick={clearAll} aria-label="필터 초기화">
              <XIcon className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}
    </div>
  )
}
