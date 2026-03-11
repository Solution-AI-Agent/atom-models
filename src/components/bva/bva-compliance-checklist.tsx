import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { IBvaRankedModel } from '@/lib/types/bva'

interface BvaComplianceChecklistProps {
  readonly models: readonly IBvaRankedModel[]
}

export function BvaComplianceChecklist({ models }: BvaComplianceChecklistProps) {
  const modelsWithChecks = models.filter((m) => m.complianceChecks.length > 0)

  if (modelsWithChecks.length === 0) return null

  const allRequirements = modelsWithChecks[0].complianceChecks

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">보안/컴플라이언스 체크리스트</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">요구사항</TableHead>
                {modelsWithChecks.map((model) => (
                  <TableHead key={model.slug} className="text-center min-w-[100px]">
                    {model.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRequirements.map((req) => (
                <TableRow key={req.requirement}>
                  <TableCell className="font-medium text-sm">{req.displayName}</TableCell>
                  {modelsWithChecks.map((model) => {
                    const check = model.complianceChecks.find(
                      (c) => c.requirement === req.requirement,
                    )
                    return (
                      <TableCell key={model.slug} className="text-center text-lg">
                        {check?.met ? (
                          <span className="text-green-600 dark:text-green-400">O</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">X</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
