import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight, Headset, Code, Megaphone, Landmark, ShoppingCart } from 'lucide-react'

interface IndustryCategoryCardProps {
  readonly category: string
  readonly categorySlug: string
  readonly count: number
}

const categoryIcons: Record<string, React.ElementType> = {
  'customer-service': Headset,
  'development': Code,
  'sales-marketing': Megaphone,
  'finance': Landmark,
  'ecommerce': ShoppingCart,
}

export function IndustryCategoryCard({ category, categorySlug, count }: IndustryCategoryCardProps) {
  const Icon = categoryIcons[categorySlug] || Headset

  return (
    <Link href={`/recommendations/${categorySlug}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{category}</h3>
            <p className="text-sm text-muted-foreground">{count}개 업무 유형</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  )
}
