import * as XLSX from 'xlsx'

const MAX_ROWS = 200
const REQUIRED_COLUMNS = ['question', 'ground_truth']

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      )
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]

    if (!sheetName) {
      return Response.json(
        { success: false, error: 'Empty workbook' },
        { status: 400 },
      )
    }

    const sheet = workbook.Sheets[sheetName]
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      return Response.json(
        { success: false, error: 'File contains no data rows' },
        { status: 400 },
      )
    }

    if (rows.length > MAX_ROWS) {
      return Response.json(
        { success: false, error: `File exceeds maximum of ${MAX_ROWS} rows (found ${rows.length})` },
        { status: 400 },
      )
    }

    const columns = Object.keys(rows[0])
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !columns.includes(col))

    if (missingColumns.length > 0) {
      return Response.json(
        { success: false, error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 },
      )
    }

    const preview = rows.slice(0, 5)

    return Response.json({
      success: true,
      data: { columns, rowCount: rows.length, preview, rows },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse file'
    return Response.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
