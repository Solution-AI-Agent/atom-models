import { NextResponse } from 'next/server'
import { generateBvaReport } from '@/lib/services/bva.service'
import type { IBvaCustomerProfile } from '@/lib/types/bva'

export async function POST(request: Request) {
  try {
    const body = await request.json() as IBvaCustomerProfile

    if (!body.industry || !body.monthlyVolume || !body.tone) {
      return NextResponse.json(
        { error: 'Missing required fields: industry, monthlyVolume, tone' },
        { status: 400 },
      )
    }

    const report = await generateBvaReport(body)
    return NextResponse.json(report)
  } catch (error) {
    console.error('BVA report generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate BVA report' },
      { status: 500 },
    )
  }
}
