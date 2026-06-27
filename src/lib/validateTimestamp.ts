import type { EventSource } from '@/types/events'

const FIVE_MINUTES = 5 * 60 * 1000
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export interface TimestampResult {
  suspect: boolean
}

export function validateTimestamp(occurredAt: string, source: EventSource): TimestampResult {
  const t = new Date(occurredAt).getTime()
  const now = Date.now()
  const drift = t - now

  if (source === 'server') {
    if (drift > 0) throw new Error('server events cannot have a future occurred_at')
    return { suspect: now - t > SEVEN_DAYS }
  }

  // browser sources: auto, custom
  if (drift > FIVE_MINUTES) throw new Error('browser event occurred_at is too far in the future')
  return { suspect: now - t > TWENTY_FOUR_HOURS }
}
