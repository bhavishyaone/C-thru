import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateBriefSentence, collectBriefFacts, type BriefFact } from '../briefGenerator'
import { processEvent } from '../processEvent'

function fakeFacts(overrides: Partial<BriefFact> = {}): BriefFact {
  return {
    activeUsers7d: 5,
    activeUsers30d: 12,
    newSignups7d: 2,
    topCompany: 'acme.com',
    topCompanyScore: { rulesMet: 3, rulesTotal: 5 },
    topUsers: [{ userId: 'u1', email: 'alice@acme.com', eventCount: 10 }],
    generatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('briefGenerator — no LLM in the brief path', () => {
  it('does not import from lib/llm or any LLM provider SDK', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/briefGenerator.ts'), 'utf-8')
    expect(src).not.toContain("from './llm'")
    expect(src).not.toContain('from "../llm"')
    expect(src).not.toMatch(/openai|anthropic|groq/i)
  })
})

describe('generateBriefSentence — deterministic template', () => {
  it('includes active user count', () => {
    const s = generateBriefSentence(fakeFacts({ activeUsers7d: 7 }))
    expect(s).toContain('7')
    expect(s).toContain('active')
  })

  it('uses singular "user" for count of 1', () => {
    const s = generateBriefSentence(fakeFacts({ activeUsers7d: 1 }))
    expect(s).toContain('1 user active')
    expect(s).not.toContain('1 users')
  })

  it('includes top company name and score fraction', () => {
    const s = generateBriefSentence(fakeFacts())
    expect(s).toContain('acme.com')
    expect(s).toContain('3/5')
  })

  it('handles zero active users gracefully', () => {
    const s = generateBriefSentence(fakeFacts({ activeUsers7d: 0, topUsers: [] }))
    expect(s).toContain('No active users')
  })

  it('includes top user email in the output', () => {
    const s = generateBriefSentence(fakeFacts())
    expect(s).toContain('alice@acme.com')
  })

  it('omits top account line when topCompany is null', () => {
    const s = generateBriefSentence(fakeFacts({ topCompany: null, topCompanyScore: null }))
    expect(s).not.toContain('Top account')
  })

  it('omits signup line when newSignups7d is 0', () => {
    const s = generateBriefSentence(fakeFacts({ newSignups7d: 0 }))
    expect(s).not.toContain('signup')
  })

  it('produces identical output for the same facts (deterministic)', () => {
    const facts = fakeFacts()
    expect(generateBriefSentence(facts)).toBe(generateBriefSentence(facts))
  })

  it('falls back to userId when email is null', () => {
    const s = generateBriefSentence(
      fakeFacts({ topUsers: [{ userId: 'anon-xyz', email: null, eventCount: 5 }] })
    )
    expect(s).toContain('anon-xyz')
  })
})

describe('collectBriefFacts — DB integration', () => {
  it('returns zero counts when there are no events', async () => {
    const facts = await collectBriefFacts()
    expect(facts.activeUsers7d).toBe(0)
    expect(facts.activeUsers30d).toBe(0)
    expect(facts.newSignups7d).toBe(0)
    expect(facts.topUsers).toHaveLength(0)
    expect(facts.topCompany).toBeNull()
  })

  it('counts active users correctly', async () => {
    const now = new Date(Date.now() - 1000).toISOString()
    await processEvent({ name: 'pageview', source: 'auto', anonymousId: 'anon-bf-1', userId: 'user-bf-1', email: 'alice@brief.io', occurredAt: now })
    await processEvent({ name: 'click', source: 'auto', anonymousId: 'anon-bf-2', userId: 'user-bf-2', email: 'bob@brief.io', occurredAt: now })
    const facts = await collectBriefFacts()
    expect(facts.activeUsers7d).toBe(2)
  })

  it('topUsers has at most 3 entries', async () => {
    const now = new Date(Date.now() - 1000).toISOString()
    for (let i = 1; i <= 5; i++) {
      await processEvent({ name: 'pageview', source: 'auto', anonymousId: `anon-tu-${i}`, userId: `user-tu-${i}`, email: `u${i}@topusers.io`, occurredAt: now })
    }
    const facts = await collectBriefFacts()
    expect(facts.topUsers.length).toBeLessThanOrEqual(3)
  })

  it('generatedAt is a valid ISO timestamp', async () => {
    const facts = await collectBriefFacts()
    expect(() => new Date(facts.generatedAt)).not.toThrow()
    expect(new Date(facts.generatedAt).getFullYear()).toBeGreaterThan(2020)
  })
})
