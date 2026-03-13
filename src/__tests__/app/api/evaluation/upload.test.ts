/**
 * @jest-environment node
 */
import * as XLSX from 'xlsx'
import { POST } from '@/app/api/evaluation/upload/route'

function createExcelBuffer(rows: Record<string, string>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return buf
}

function createFileRequest(buffer: ArrayBuffer, fileName = 'test.xlsx'): Request {
  const file = new File([buffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const formData = new FormData()
  formData.append('file', file)
  return new Request('http://localhost/api/evaluation/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/evaluation/upload', () => {
  it('parses valid Excel file with required columns', async () => {
    const rows = [
      { question: 'What is 1+1?', ground_truth: '2' },
      { question: 'Capital of France?', ground_truth: 'Paris' },
    ]
    const buffer = createExcelBuffer(rows)
    const request = createFileRequest(buffer)

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.columns).toContain('question')
    expect(body.data.columns).toContain('ground_truth')
    expect(body.data.rowCount).toBe(2)
    expect(body.data.rows).toHaveLength(2)
    expect(body.data.preview).toHaveLength(2)
  })

  it('rejects file with missing required columns', async () => {
    const rows = [
      { question: 'What is 1+1?', answer: '2' },
    ]
    const buffer = createExcelBuffer(rows)
    const request = createFileRequest(buffer)

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toContain('ground_truth')
  })

  it('rejects file exceeding 200 rows', async () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({
      question: `Q${i}`,
      ground_truth: `A${i}`,
    }))
    const buffer = createExcelBuffer(rows)
    const request = createFileRequest(buffer)

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toContain('200')
  })

  it('rejects request with no file', async () => {
    const formData = new FormData()
    const request = new Request('http://localhost/api/evaluation/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toContain('No file')
  })

  it('returns preview limited to 5 rows', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      question: `Q${i}`,
      ground_truth: `A${i}`,
    }))
    const buffer = createExcelBuffer(rows)
    const request = createFileRequest(buffer)

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.preview).toHaveLength(5)
    expect(body.data.rows).toHaveLength(10)
  })

  it('handles additional columns beyond required ones', async () => {
    const rows = [
      { question: 'Q1', ground_truth: 'A1', context: 'Some context', category: 'math' },
    ]
    const buffer = createExcelBuffer(rows)
    const request = createFileRequest(buffer)

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.columns).toContain('context')
    expect(body.data.columns).toContain('category')
  })
})
