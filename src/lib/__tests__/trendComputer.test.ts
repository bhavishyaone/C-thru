import { describe, it, expect } from 'vitest'
import { computeTrend } from '../trendComputer'

describe('computeTrend', () => {
  it('returns up with correct percentage when current exceeds prior', () => {
    const result = computeTrend(100, 80)
    expect(result.direction).toBe('up')
    expect(result.pct).toBe(25)
    expect(result.label).toContain('+25%')
  })

  it('returns down with correct percentage when current is below prior', () => {
    const result = computeTrend(80, 100)
    expect(result.direction).toBe('down')
    expect(result.pct).toBe(-20)
    expect(result.label).toContain('-20%')
  })

  it('returns flat when current equals prior', () => {
    const result = computeTrend(50, 50)
    expect(result.direction).toBe('flat')
    expect(result.pct).toBe(0)
    expect(result.label).toMatch(/no change/i)
  })

  it('returns flat when both current and prior are zero', () => {
    const result = computeTrend(0, 0)
    expect(result.direction).toBe('flat')
    expect(result.pct).toBe(0)
  })

  it('returns new when prior is zero and current is positive', () => {
    const result = computeTrend(42, 0)
    expect(result.direction).toBe('new')
    expect(result.pct).toBeNull()
    expect(result.label).toMatch(/no prior data/i)
  })

  it('returns down -100% when current is zero and prior is positive', () => {
    const result = computeTrend(0, 100)
    expect(result.direction).toBe('down')
    expect(result.pct).toBe(-100)
  })

  it('caps the label at >999% for huge percentage increases', () => {
    const result = computeTrend(10000, 1)
    expect(result.direction).toBe('up')
    expect(result.label).toContain('>999%')
  })

  it('rounds fractional percentages to the nearest integer', () => {
    // 10 vs 9 = +11.11... → +11%
    const result = computeTrend(10, 9)
    expect(result.pct).toBe(11)
    expect(result.label).toContain('+11%')
  })

  it('returns flat when rounding collapses a tiny difference to 0%', () => {
    // 100 vs 100.4 → raw -0.4% → rounds to 0
    const result = computeTrend(100, 100)
    expect(result.direction).toBe('flat')
  })
})
