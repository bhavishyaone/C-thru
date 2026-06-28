import { generateSql } from './llm'
import { getSchemaContext } from './schemaContext'
import { validateAndRun } from './sqlGuard'
import { computeTrend, Trend } from './trendComputer'
import { interpretationLabel } from './interpretationLabel'

export interface AskResult {
  question: string
  sql: string
  rows: Record<string, unknown>[]
  rowCount: number
  trend: Trend | null
  label: string
}

export async function ask(question: string): Promise<AskResult> {
  const schemaContext = await getSchemaContext()
  const rawSql = await generateSql(question, schemaContext)
  const { rows, rowCount, sql } = await validateAndRun(rawSql)

  const trend = await deriveTrend(sql, rows)
  const label = interpretationLabel(sql)

  return { question, sql, rows, rowCount, trend, label }
}

async function deriveTrend(sql: string, rows: Record<string, unknown>[]): Promise<Trend | null> {
  const current = extractAggregate(rows)
  if (current === null) return null

  const priorSql = derivePriorSql(sql)
  if (!priorSql) return null

  try {
    const { rows: priorRows } = await validateAndRun(priorSql)
    const prior = extractAggregate(priorRows)
    if (prior === null) return null
    return computeTrend(current, prior)
  } catch {
    return null
  }
}

function extractAggregate(rows: Record<string, unknown>[]): number | null {
  if (rows.length !== 1) return null
  const vals = Object.values(rows[0]!)
  if (vals.length !== 1) return null
  const n = Number(vals[0])
  return isNaN(n) ? null : n
}

function derivePriorSql(sql: string): string | null {
  // Match: >= NOW() - INTERVAL 'N unit' (the LLM's standard pattern for time windows)
  const m = sql.match(/>=?\s*NOW\(\)\s*-\s*INTERVAL\s+'(\d+)\s+(day|week|month)s?'/i)
  if (!m) return null

  const n = parseInt(m[1]!, 10)
  const unit = m[2]!.toLowerCase()

  return sql.replace(
    />=?\s*NOW\(\)\s*-\s*INTERVAL\s+'(\d+)\s+(day|week|month)s?'/gi,
    `BETWEEN NOW() - INTERVAL '${2 * n} ${unit}s' AND NOW() - INTERVAL '${n} ${unit}s'`
  )
}
