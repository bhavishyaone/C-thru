import { describe, it, expect } from 'vitest'
import { runMigrations } from '../migrate'
import { db } from '../db'

describe('runMigrations()', () => {
  it('is idempotent — can be called multiple times without error', async () => {
    await expect(runMigrations()).resolves.toBeUndefined()
    await expect(runMigrations()).resolves.toBeUndefined()
  })

  it('ensures all expected tables exist after running', async () => {
    await runMigrations()
    const { rows } = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
      ORDER BY table_name
    `, [['events', 'users', 'companies', 'aliases', 'blocked_domains', 'key_events']])

    const names = rows.map((r: { table_name: string }) => r.table_name)
    expect(names).toContain('events')
    expect(names).toContain('users')
    expect(names).toContain('companies')
    expect(names).toContain('aliases')
    expect(names).toContain('blocked_domains')
    expect(names).toContain('key_events')
  })

  it('seeds blocked_domains with personal email providers', async () => {
    await runMigrations()
    const { rows } = await db.query(
      'SELECT domain FROM blocked_domains WHERE domain = ANY($1)',
      [['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com']]
    )
    expect(rows.length).toBeGreaterThanOrEqual(5)
  })

  it('ensures the events_v view exists', async () => {
    await runMigrations()
    const { rows } = await db.query(`
      SELECT viewname FROM pg_views
      WHERE schemaname = 'public' AND viewname = 'events_v'
    `)
    expect(rows).toHaveLength(1)
  })
})
