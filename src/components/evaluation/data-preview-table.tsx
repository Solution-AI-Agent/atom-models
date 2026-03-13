import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataPreviewTableProps {
  readonly columns: readonly string[]
  readonly preview: readonly Record<string, string>[]
  readonly totalRows: number
}

export function DataPreviewTable({ columns, preview, totalRows }: DataPreviewTableProps) {
  const displayRows = preview.slice(0, 5)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">데이터 미리보기</p>
        <p className="text-xs text-muted-foreground">
          전체 {totalRows}행 중 {displayRows.length}행 표시
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col} className="max-w-[200px] truncate">
                    {row[col] ?? ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
