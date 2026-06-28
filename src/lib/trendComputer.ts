export type TrendDirection = 'up' | 'down' | 'flat' | 'new'

export interface Trend {
  direction: TrendDirection
  pct: number | null
  label: string
}

export function computeTrend(current: number, prior: number): Trend {
  if (prior === 0 && current === 0) {
    return { direction: 'flat', pct: 0, label: 'No change vs prior period' }
  }

  if (prior === 0) {
    return { direction: 'new', pct: null, label: 'New this period (no prior data)' }
  }

  const rawPct = ((current - prior) / prior) * 100
  const pct = Math.round(rawPct)

  if (pct === 0) {
    return { direction: 'flat', pct: 0, label: 'No change vs prior period' }
  }

  if (pct > 0) {
    const display = pct > 999 ? '>999%' : `+${pct}%`
    return { direction: 'up', pct, label: `${display} vs prior period` }
  }

  return { direction: 'down', pct, label: `${pct}% vs prior period` }
}
