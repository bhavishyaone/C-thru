import { db } from './db'
import { scoreAllCompanies } from './readinessEngine'

export interface BriefUser {
  userId: string
  email: string | null
  eventCount: number
}

export interface BriefFact {
  activeUsers7d: number
  activeUsers30d: number
  newSignups7d: number
  topCompany: string | null
  topCompanyScore: { rulesMet: number; rulesTotal: number } | null
  topUsers: BriefUser[]
  generatedAt: string
}

export async function collectBriefFacts(): Promise<BriefFact> {
  const [au7Result, au30Result, signupResult, topUsersResult, scores] = await Promise.all([
    db.query<{ cnt: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS cnt
       FROM active_users_v
       WHERE last_event_at >= NOW() - INTERVAL '7 days'`
    ),
    db.query<{ cnt: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS cnt
       FROM active_users_v
       WHERE last_event_at >= NOW() - INTERVAL '30 days'`
    ),
    db.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM signups_v
       WHERE signed_up_at >= NOW() - INTERVAL '7 days'`
    ),
    db.query<{ user_id: string; email: string | null; total_events: string }>(
      `SELECT user_id, email, total_events::text
       FROM active_users_v
       WHERE last_event_at >= NOW() - INTERVAL '7 days'
       ORDER BY total_events DESC
       LIMIT 3`
    ),
    scoreAllCompanies(),
  ])

  const topCompany = scores[0] ?? null

  return {
    activeUsers7d: Number(au7Result.rows[0]?.cnt ?? 0),
    activeUsers30d: Number(au30Result.rows[0]?.cnt ?? 0),
    newSignups7d: Number(signupResult.rows[0]?.cnt ?? 0),
    topCompany: topCompany?.domain ?? null,
    topCompanyScore: topCompany
      ? { rulesMet: topCompany.rulesMet, rulesTotal: topCompany.rulesTotal }
      : null,
    topUsers: topUsersResult.rows.map(r => ({
      userId: r.user_id,
      email: r.email,
      eventCount: Number(r.total_events),
    })),
    generatedAt: new Date().toISOString(),
  }
}

export function generateBriefSentence(facts: BriefFact): string {
  const parts: string[] = []

  if (facts.activeUsers7d === 0) {
    parts.push('No active users in the last 7 days.')
  } else {
    const u = facts.activeUsers7d === 1 ? 'user' : 'users'
    parts.push(`${facts.activeUsers7d} ${u} active in the last 7 days.`)
  }

  if (facts.newSignups7d > 0) {
    const s = facts.newSignups7d === 1 ? 'signup' : 'signups'
    parts.push(`${facts.newSignups7d} new ${s} this week.`)
  }

  if (facts.topCompany && facts.topCompanyScore) {
    const { rulesMet, rulesTotal } = facts.topCompanyScore
    parts.push(`Top account: ${facts.topCompany} (${rulesMet}/${rulesTotal} rules met).`)
  }

  if (facts.topUsers.length > 0) {
    const names = facts.topUsers.map(u => u.email ?? u.userId).join(', ')
    parts.push(`Most active: ${names}.`)
  }

  return parts.join(' ')
}
