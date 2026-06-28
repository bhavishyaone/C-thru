import { NextResponse } from 'next/server'
import { collectBriefFacts, generateBriefSentence } from '@/lib/briefGenerator'

export async function GET() {
  const facts = await collectBriefFacts()
  return NextResponse.json({ facts, brief: generateBriefSentence(facts) })
}
