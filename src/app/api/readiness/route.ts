import { NextResponse } from 'next/server'
import { scoreAllCompanies } from '@/lib/readinessEngine'

export async function GET() {
  try {
    const scores = await scoreAllCompanies()
    return NextResponse.json(scores)
  } catch (e) {
    console.error('readiness scoring error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to compute readiness scores' }, { status: 500 })
  }
}
