import { describe, it, expect } from 'vitest'
import { interpretationLabel } from '../interpretationLabel'

describe('interpretationLabel', () => {
  it('labels a signups_v query with a 7-day window', () => {
    expect(
      interpretationLabel(
        "SELECT COUNT(*) FROM signups_v WHERE signed_up_at >= NOW() - INTERVAL '7 days' LIMIT 500"
      )
    ).toBe('Signups — last 7 days')
  })

  it('labels a signups_v query with no window as all time', () => {
    expect(interpretationLabel('SELECT COUNT(*) FROM signups_v LIMIT 500'))
      .toBe('Signups — all time')
  })

  it('labels an active_users_v query with a 30-day window', () => {
    expect(
      interpretationLabel(
        "SELECT COUNT(*) FROM active_users_v WHERE last_event_at >= NOW() - INTERVAL '30 days' LIMIT 500"
      )
    ).toBe('Active users — last 30 days')
  })

  it('labels a company_activity_v query', () => {
    expect(
      interpretationLabel('SELECT domain, total_events FROM company_activity_v ORDER BY total_events DESC LIMIT 500')
    ).toBe('Company activity — all time')
  })

  it('labels an events_v query', () => {
    expect(
      interpretationLabel("SELECT COUNT(*) FROM events_v WHERE name = 'signup_completed' LIMIT 500")
    ).toBe('Events — all time')
  })

  it('returns Custom query for a multi-view join', () => {
    expect(
      interpretationLabel('SELECT s.user_id FROM signups_v s JOIN active_users_v a ON s.user_id = a.user_id')
    ).toBe('Custom query')
  })

  it('returns Custom query on parse error', () => {
    expect(interpretationLabel('NOT VALID SQL @@##')).toBe('Custom query')
  })

  it('uses singular unit when N = 1', () => {
    expect(
      interpretationLabel(
        "SELECT COUNT(*) FROM signups_v WHERE signed_up_at >= NOW() - INTERVAL '1 day'"
      )
    ).toBe('Signups — last 1 day')
  })

  it('label is derived from AST — no LLM import in interpretationLabel.ts', () => {
    // The module must not import from llm, ai, or any LLM SDK
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/lib/interpretationLabel.ts'),
      'utf-8'
    ) as string
    expect(src).not.toContain("from './llm'")
    expect(src).not.toContain("from 'ai'")
    expect(src).not.toContain('@ai-sdk')
  })
})
