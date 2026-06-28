import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateSql } from '../llm'
import { getSchemaContext } from '../schemaContext'

vi.mock('../llm', () => ({ generateSql: vi.fn() }))
vi.mock('../schemaContext', () => ({ getSchemaContext: vi.fn() }))

const mockGenerateSql = vi.mocked(generateSql)
const mockGetSchemaContext = vi.mocked(getSchemaContext)

beforeEach(() => {
  mockGetSchemaContext.mockResolvedValue('-- mock schema')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ask', () => {
  it('returns rows for a valid generated SQL', async () => {
    mockGenerateSql.mockResolvedValue('SELECT user_id FROM signups_v LIMIT 10')

    const { processEvent } = await import('../processEvent')
    await processEvent({
      name: 'pageview',
      source: 'auto',
      anonymousId: 'anon-ask-1',
      occurredAt: new Date().toISOString(),
      userId: 'user-ask-1',
      email: 'alice@acme.com',
    })

    const { ask } = await import('../ask')
    const result = await ask('show me all signups')

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ user_id: 'user-ask-1' })
    expect(result.question).toBe('show me all signups')
  })

  it('passes the schema context to generateSql', async () => {
    mockGetSchemaContext.mockResolvedValue('-- signups_v schema here')
    mockGenerateSql.mockResolvedValue('SELECT user_id FROM signups_v LIMIT 5')

    const { ask } = await import('../ask')
    await ask('any question')

    expect(mockGenerateSql).toHaveBeenCalledWith('any question', '-- signups_v schema here')
  })

  it('returns the executed SQL including any injected LIMIT', async () => {
    mockGenerateSql.mockResolvedValue('SELECT user_id FROM signups_v')

    const { ask } = await import('../ask')
    const result = await ask('show signups')

    expect(result.sql).toMatch(/limit\s+500/i)
  })

  it('throws when the generated SQL is not a SELECT', async () => {
    mockGenerateSql.mockResolvedValue("INSERT INTO users (email) VALUES ('x@x.com')")

    const { ask } = await import('../ask')
    await expect(ask('any question')).rejects.toThrow('Only SELECT is allowed')
  })

  it('throws when the generated SQL references a non-allowed table', async () => {
    mockGenerateSql.mockResolvedValue('SELECT * FROM users')

    const { ask } = await import('../ask')
    await expect(ask('any question')).rejects.toThrow('not in the allowed query surface')
  })

  it('returns trend: null when result has more than one row', async () => {
    mockGenerateSql.mockResolvedValue(
      "SELECT user_id, signed_up_at FROM signups_v WHERE signed_up_at >= NOW() - INTERVAL '7 days' LIMIT 100"
    )

    const { processEvent } = await import('../processEvent')
    for (const [i, email] of ['a@x.com', 'b@x.com'].entries()) {
      await processEvent({
        name: 'pageview',
        source: 'auto',
        anonymousId: `anon-multi-${i}`,
        occurredAt: new Date().toISOString(),
        userId: `user-multi-${i}`,
        email,
      })
    }

    const { ask } = await import('../ask')
    const result = await ask('show signups this week')
    expect(result.trend).toBeNull()
  })

  it('returns trend: null when SQL has no recognisable INTERVAL pattern', async () => {
    mockGenerateSql.mockResolvedValue('SELECT COUNT(*) FROM signups_v LIMIT 500')

    const { processEvent } = await import('../processEvent')
    await processEvent({
      name: 'pageview',
      source: 'auto',
      anonymousId: 'anon-notrend',
      occurredAt: new Date().toISOString(),
      userId: 'user-notrend',
      email: 'c@company.com',
    })

    const { ask } = await import('../ask')
    const result = await ask('total signups all time')
    expect(result.trend).toBeNull()
  })

  it('computes an upward trend when current period exceeds prior', async () => {
    const { db } = await import('../db')

    // Seed prior period: 2 signups older than 7 days
    await db.query(`
      INSERT INTO users (user_id, email, first_seen, last_seen)
      VALUES
        ('u-trend-old-1', 'old1@corp.com', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
        ('u-trend-old-2', 'old2@corp.com', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days')
      ON CONFLICT (user_id) DO NOTHING
    `)

    // Seed current period: 6 signups in last 7 days
    for (let i = 0; i < 6; i++) {
      await db.query(`
        INSERT INTO users (user_id, email, first_seen, last_seen)
        VALUES ($1, $2, NOW() - INTERVAL '${i + 1} days', NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [`u-trend-new-${i}`, `new${i}@corp.com`])
    }

    mockGenerateSql.mockResolvedValue(
      "SELECT COUNT(*) FROM signups_v WHERE signed_up_at >= NOW() - INTERVAL '7 days'"
    )

    const { ask } = await import('../ask')
    const result = await ask('signups last 7 days')

    expect(result.trend).not.toBeNull()
    expect(result.trend!.direction).toBe('up')
    expect(result.trend!.pct).toBeGreaterThan(0)
  })
})
