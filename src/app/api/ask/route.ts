import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/ask'

const VALIDATION_PATTERNS = [
  'Only SELECT is allowed',
  'not in the allowed query surface',
  'single SELECT statement',
  'must be a SELECT',
  'SQL parse error',
  'SQL is empty',
]

export async function POST(request: NextRequest) {
  const body = await request.json() as { question?: string }
  const question = body.question?.trim()

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  try {
    const result = await ask(question)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    const isValidation = VALIDATION_PATTERNS.some(p => message.includes(p))
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 })
  }
}
