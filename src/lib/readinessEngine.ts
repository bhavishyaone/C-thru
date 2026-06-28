import { db } from './db'

export type SignalType =
  | 'active_users'
  | 'total_events'
  | 'days_since_active'
  | 'key_event_fired'
  | 'days_in_product'

export interface ReadinessRule {
  id: number
  label: string
  signal: SignalType
  operator: '>=' | '<='
  threshold: number
  window_days: number | null
  event_name: string | null
}

export interface RuleResult {
  ruleId: number
  label: string
  passed: boolean
  value: string
}

export interface CompanyScore {
  domain: string
  rulesMet: number
  rulesTotal: number
  breakdown: RuleResult[]
}

// Prebuilt domain maps fed into evaluateSignal — one map per signal type.
// Maps are built by scoreAllCompanies using batched GROUP BY queries (Issue #3).
export interface SignalMaps {
  activeUsers: Map<string, number>       // domain → count of active users in window
  totalEvents: Map<string, number>       // domain → count of events in window
  lastEventDaysAgo: Map<string, number>  // domain → days since last event
  keyEventFired: Map<string, Set<string>>// domain → set of fired event names
  daysInProduct: Map<string, number>     // domain → days since first signup
}

// evaluateSignal — the single tested seam for all five signal branches (D-21).
// Pure: reads from pre-built maps, never queries the DB.
export function evaluateSignal(
  rule: ReadinessRule,
  domain: string,
  maps: SignalMaps
): RuleResult {
  switch (rule.signal) {
    case 'active_users': {
      const count = maps.activeUsers.get(domain) ?? 0
      const passed = rule.operator === '>='
        ? count >= rule.threshold
        : count <= rule.threshold
      return { ruleId: rule.id, label: rule.label, passed, value: `${count} users` }
    }
    case 'total_events': {
      const count = maps.totalEvents.get(domain) ?? 0
      const passed = rule.operator === '>='
        ? count >= rule.threshold
        : count <= rule.threshold
      return { ruleId: rule.id, label: rule.label, passed, value: `${count} events` }
    }
    case 'days_since_active': {
      const days = maps.lastEventDaysAgo.get(domain)
      if (days === undefined) {
        return { ruleId: rule.id, label: rule.label, passed: false, value: 'never active' }
      }
      const passed = rule.operator === '>='
        ? days >= rule.threshold
        : days <= rule.threshold
      const daysLabel = days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`
      return { ruleId: rule.id, label: rule.label, passed, value: `last active ${daysLabel}` }
    }
    case 'key_event_fired': {
      const firedEvents = maps.keyEventFired.get(domain) ?? new Set<string>()
      const eventName = rule.event_name ?? ''
      const passed = firedEvents.has(eventName)
      return {
        ruleId: rule.id,
        label: rule.label,
        passed,
        value: passed ? `fired ${eventName}` : `${eventName} never fired`,
      }
    }
    case 'days_in_product': {
      const days = maps.daysInProduct.get(domain)
      if (days === undefined) {
        return { ruleId: rule.id, label: rule.label, passed: false, value: 'no signups' }
      }
      const passed = rule.operator === '>='
        ? days >= rule.threshold
        : days <= rule.threshold
      return { ruleId: rule.id, label: rule.label, passed, value: `${days} days` }
    }
  }
}

export type CreateRuleInput = Omit<ReadinessRule, 'id'>
export type UpdateRuleInput = Partial<Omit<ReadinessRule, 'id'>>

// listRules — fetch all rules from DB ordered by id.
export async function listRules(): Promise<ReadinessRule[]> {
  const { rows } = await db.query<ReadinessRule>(
    'SELECT id, label, signal, operator, threshold::numeric, window_days, event_name FROM readiness_rules ORDER BY id'
  )
  return rows.map(r => ({ ...r, threshold: Number(r.threshold) }))
}

export async function createRule(input: CreateRuleInput): Promise<ReadinessRule> {
  const { rows } = await db.query<ReadinessRule>(
    `INSERT INTO readiness_rules (label, signal, operator, threshold, window_days, event_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, label, signal, operator, threshold::numeric, window_days, event_name`,
    [input.label, input.signal, input.operator, input.threshold, input.window_days ?? null, input.event_name ?? null]
  )
  return { ...rows[0]!, threshold: Number(rows[0]!.threshold) }
}

export async function updateRule(id: number, input: UpdateRuleInput): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let i = 1
  if (input.label !== undefined)       { setClauses.push(`label = $${i++}`);       values.push(input.label) }
  if (input.threshold !== undefined)   { setClauses.push(`threshold = $${i++}`);   values.push(input.threshold) }
  if (input.window_days !== undefined) { setClauses.push(`window_days = $${i++}`); values.push(input.window_days) }
  if (input.event_name !== undefined)  { setClauses.push(`event_name = $${i++}`);  values.push(input.event_name) }
  if (setClauses.length === 0) return
  values.push(id)
  await db.query(`UPDATE readiness_rules SET ${setClauses.join(', ')} WHERE id = $${i}`, values)
}

export async function deleteRule(id: number): Promise<void> {
  await db.query('DELETE FROM readiness_rules WHERE id = $1', [id])
}

// buildSignalMaps — run the 5 batched GROUP BY queries across ALL companies at once.
// Returns a SignalMaps struct for use by evaluateSignal.
// 5 queries total, regardless of company count — never looped per-company (D-21).
export async function buildSignalMaps(rules: ReadinessRule[]): Promise<SignalMaps> {
  const maps: SignalMaps = {
    activeUsers: new Map(),
    totalEvents: new Map(),
    lastEventDaysAgo: new Map(),
    keyEventFired: new Map(),
    daysInProduct: new Map(),
  }

  const activeUsersRule = rules.find(r => r.signal === 'active_users')
  const totalEventsRule = rules.find(r => r.signal === 'total_events')
  const keyEventRules = rules.filter(r => r.signal === 'key_event_fired')

  // 1. active_users — identified users active within the window
  if (activeUsersRule?.window_days) {
    const { rows } = await db.query<{ company_domain: string; cnt: string }>(
      `SELECT company_domain, COUNT(DISTINCT user_id)::text AS cnt
       FROM active_users_v
       WHERE last_event_at >= NOW() - ($1 || ' days')::INTERVAL
         AND company_domain IS NOT NULL
       GROUP BY company_domain`,
      [activeUsersRule.window_days]
    )
    for (const row of rows) maps.activeUsers.set(row.company_domain, Number(row.cnt))
  }

  // 2. total_events — events within the window
  if (totalEventsRule?.window_days) {
    const { rows } = await db.query<{ company_domain: string; cnt: string }>(
      `SELECT company_domain, COUNT(*)::text AS cnt
       FROM events_v
       WHERE received_at >= NOW() - ($1 || ' days')::INTERVAL
         AND company_domain IS NOT NULL
       GROUP BY company_domain`,
      [totalEventsRule.window_days]
    )
    for (const row of rows) maps.totalEvents.set(row.company_domain, Number(row.cnt))
  }

  // 3. days_since_active — days since last event per company
  {
    const { rows } = await db.query<{ domain: string; days: string }>(
      `SELECT domain,
              EXTRACT(EPOCH FROM (NOW() - last_event_at)) / 86400 AS days
       FROM company_activity_v`
    )
    for (const row of rows) maps.lastEventDaysAgo.set(row.domain, Math.floor(Number(row.days)))
  }

  // 4. key_event_fired — which event names each company has fired
  if (keyEventRules.length > 0) {
    const eventNames = keyEventRules.map(r => r.event_name).filter(Boolean) as string[]
    const { rows } = await db.query<{ company_domain: string; name: string }>(
      `SELECT DISTINCT company_domain, name
       FROM events_v
       WHERE name = ANY($1::text[]) AND company_domain IS NOT NULL`,
      [eventNames]
    )
    for (const row of rows) {
      if (!maps.keyEventFired.has(row.company_domain)) {
        maps.keyEventFired.set(row.company_domain, new Set())
      }
      maps.keyEventFired.get(row.company_domain)!.add(row.name)
    }
  }

  // 5. days_in_product — days since first signup per company
  {
    const { rows } = await db.query<{ company_domain: string; days: string }>(
      `SELECT company_domain,
              EXTRACT(EPOCH FROM (NOW() - MIN(signed_up_at))) / 86400 AS days
       FROM signups_v
       WHERE company_domain IS NOT NULL
       GROUP BY company_domain`
    )
    for (const row of rows) maps.daysInProduct.set(row.company_domain, Math.floor(Number(row.days)))
  }

  return maps
}

// scoreAllCompanies — compute CompanyScore for every known company.
// Runs buildSignalMaps (5 queries) then evaluates all rules in memory.
export async function scoreAllCompanies(): Promise<CompanyScore[]> {
  const rules = await listRules()
  if (rules.length === 0) return []

  const maps = await buildSignalMaps(rules)

  // Collect all company domains across all signal maps
  const allDomains = new Set<string>([
    ...maps.activeUsers.keys(),
    ...maps.totalEvents.keys(),
    ...maps.lastEventDaysAgo.keys(),
    ...maps.keyEventFired.keys(),
    ...maps.daysInProduct.keys(),
  ])

  const scores: CompanyScore[] = []
  for (const domain of allDomains) {
    const breakdown = rules.map(rule => evaluateSignal(rule, domain, maps))
    const rulesMet = breakdown.filter(r => r.passed).length
    scores.push({ domain, rulesMet, rulesTotal: rules.length, breakdown })
  }

  return scores.sort((a, b) => b.rulesMet - a.rulesMet)
}

// scoreCompany — compute breakdown for a single domain (still uses the batched 5 queries).
export async function scoreCompany(domain: string): Promise<CompanyScore | null> {
  const scores = await scoreAllCompanies()
  return scores.find(s => s.domain === domain) ?? null
}
