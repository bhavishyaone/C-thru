import { parse } from 'pgsql-ast-parser'

const VIEW_LABELS: Record<string, string> = {
  signups_v:           'Signups',
  active_users_v:      'Active users',
  company_activity_v:  'Company activity',
  events_v:            'Events',
}

export function interpretationLabel(sql: string): string {
  try {
    const views = extractViewNames(sql)
    const interval = extractInterval(sql)

    if (views.length !== 1) return 'Custom query'

    const base = VIEW_LABELS[views[0]!] ?? 'Custom query'
    const window = interval ? `last ${interval}` : 'all time'
    return `${base} — ${window}`
  } catch {
    return 'Custom query'
  }
}

function extractViewNames(sql: string): string[] {
  const stmts = parse(sql)
  const names: string[] = []
  collectTableNames(stmts[0], names)
  return [...new Set(names)].filter(n => n in VIEW_LABELS)
}

function collectTableNames(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return
  const n = node as Record<string, unknown>

  if (n['type'] === 'table' && n['name'] && typeof (n['name'] as Record<string, unknown>)['name'] === 'string') {
    out.push((n['name'] as Record<string, unknown>)['name'] as string)
    return
  }

  for (const val of Object.values(n)) {
    if (Array.isArray(val)) {
      for (const item of val) collectTableNames(item, out)
    } else if (val && typeof val === 'object') {
      collectTableNames(val, out)
    }
  }
}

function extractInterval(sql: string): string | null {
  const m = sql.match(/INTERVAL\s+'(\d+)\s+(day|week|month)s?'/i)
  if (!m) return null
  const n = m[1]!
  const unit = m[2]!.toLowerCase()
  return n === '1' ? `1 ${unit}` : `${n} ${unit}s`
}
