import { describe, it, expect } from 'vitest'
import { processEvent } from '../processEvent'
import { db } from '../db'

const now = () => new Date(Date.now() - 1000).toISOString()

describe('aliases.first_identified_at (D-24)', () => {
  it('is set when an alias is first created', async () => {
    const before = new Date()
    await processEvent({
      name: 'identify',
      source: 'custom',
      anonymousId: 'anon-fi-1',
      userId: 'user-fi-1',
      occurredAt: now(),
    })
    const after = new Date()

    const { rows } = await db.query(
      'SELECT first_identified_at FROM aliases WHERE anonymous_id = $1',
      ['anon-fi-1']
    )
    expect(rows).toHaveLength(1)
    const t = new Date(rows[0].first_identified_at)
    expect(t.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    expect(t.getTime()).toBeLessThanOrEqual(after.getTime() + 1000)
  })

  it('does NOT move when the same anonymous_id re-identifies with a new userId', async () => {
    // First identify
    await processEvent({
      name: 'identify',
      source: 'custom',
      anonymousId: 'anon-fi-2',
      userId: 'user-fi-2a',
      occurredAt: now(),
    })
    const { rows: first } = await db.query(
      'SELECT first_identified_at FROM aliases WHERE anonymous_id = $1',
      ['anon-fi-2']
    )
    const original = first[0].first_identified_at

    await new Promise(r => setTimeout(r, 20))

    // Re-identify on a second device / session
    await processEvent({
      name: 'identify',
      source: 'custom',
      anonymousId: 'anon-fi-2',
      userId: 'user-fi-2b',
      occurredAt: now(),
    })
    const { rows: second } = await db.query(
      'SELECT first_identified_at, user_id, updated_at FROM aliases WHERE anonymous_id = $1',
      ['anon-fi-2']
    )

    // last-write-wins on user_id is unchanged (existing contract)
    expect(second[0].user_id).toBe('user-fi-2b')
    // updated_at advanced (confirms the upsert actually ran)
    expect(new Date(second[0].updated_at).getTime()).toBeGreaterThan(
      new Date(original).getTime()
    )
    // first_identified_at must be identical to the original
    expect(second[0].first_identified_at).toEqual(original)
  })

  it('does NOT move when the same anonymous_id re-identifies with a new email', async () => {
    await processEvent({
      name: 'identify',
      source: 'custom',
      anonymousId: 'anon-fi-3',
      userId: 'user-fi-3',
      email: 'first@acme.com',
      occurredAt: now(),
    })
    const { rows: first } = await db.query(
      'SELECT first_identified_at FROM aliases WHERE anonymous_id = $1',
      ['anon-fi-3']
    )
    const original = first[0].first_identified_at

    await new Promise(r => setTimeout(r, 20))

    await processEvent({
      name: 'identify',
      source: 'custom',
      anonymousId: 'anon-fi-3',
      userId: 'user-fi-3',
      email: 'updated@acme.com',
      occurredAt: now(),
    })
    const { rows: second } = await db.query(
      'SELECT first_identified_at FROM aliases WHERE anonymous_id = $1',
      ['anon-fi-3']
    )
    expect(second[0].first_identified_at).toEqual(original)
  })

  it('two different anonymous_ids get independent first_identified_at values', async () => {
    await processEvent({
      name: 'identify',
      source: 'custom',
      anonymousId: 'anon-fi-4a',
      userId: 'user-fi-4a',
      occurredAt: now(),
    })
    await new Promise(r => setTimeout(r, 20))
    await processEvent({
      name: 'identify',
      source: 'custom',
      anonymousId: 'anon-fi-4b',
      userId: 'user-fi-4b',
      occurredAt: now(),
    })

    const { rows } = await db.query(
      "SELECT anonymous_id, first_identified_at FROM aliases WHERE anonymous_id IN ('anon-fi-4a','anon-fi-4b') ORDER BY anonymous_id"
    )
    expect(rows).toHaveLength(2)
    // The two timestamps are distinct (4b > 4a by the sleep)
    expect(new Date(rows[1].first_identified_at).getTime()).toBeGreaterThan(
      new Date(rows[0].first_identified_at).getTime()
    )
  })
})
