import { HeroSection } from '@/components/home/hero-section'
import { StatsOverview } from '@/components/home/stats-overview'
import { NewModelsSection } from '@/components/home/new-models-section'
import { QuickAccessCards } from '@/components/home/quick-access-cards'
import { getModelCount, getNewModels } from '@/lib/services/model.service'
import { getAllPresets } from '@/lib/services/preset.service'
import type { IModel } from '@/lib/types/model'

export default async function HomePage() {
  const [modelCount, newModels, presets] = await Promise.all([
    getModelCount(),
    getNewModels(6),
    getAllPresets(),
  ])

  return (
    <div className="flex flex-col gap-8">
      <HeroSection />
      <StatsOverview modelCount={modelCount} presetCount={presets.length} />
      <NewModelsSection models={newModels as unknown as IModel[]} />
      <QuickAccessCards />
    </div>
  )
}
