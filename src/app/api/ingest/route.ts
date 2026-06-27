import { NextRequest, NextResponse } from 'next/server'
import { processEvent } from '@/lib/processEvent'
import type { RawEvent } from '@/types/events'

export async function POST(request: NextRequest) {
  const body = await request.json() as { events: RawEvent[] }

  for (const event of body.events) {
    await processEvent(event)
  }

  return NextResponse.json({ ok: true })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
