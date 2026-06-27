import { describe, it, expect, beforeAll } from 'vitest'
import { classifyDomain, refreshBlockedDomains } from '../domainClassifier'

beforeAll(async () => {
  // Force reload from DB so the seeded blocked_domains are picked up
  await refreshBlockedDomains()
})

describe('classifyDomain — personal email domains', () => {
  it('returns null for gmail.com', async () => {
    expect(await classifyDomain('user@gmail.com')).toEqual({ companyDomain: null })
  })

  it('returns null for yahoo.com', async () => {
    expect(await classifyDomain('user@yahoo.com')).toEqual({ companyDomain: null })
  })

  it('returns null for hotmail.com', async () => {
    expect(await classifyDomain('user@hotmail.com')).toEqual({ companyDomain: null })
  })

  it('returns null for outlook.com', async () => {
    expect(await classifyDomain('user@outlook.com')).toEqual({ companyDomain: null })
  })

  it('returns null for icloud.com', async () => {
    expect(await classifyDomain('user@icloud.com')).toEqual({ companyDomain: null })
  })

  it('returns null for zoho.com', async () => {
    expect(await classifyDomain('user@zoho.com')).toEqual({ companyDomain: null })
  })

  it('returns null for protonmail.com', async () => {
    expect(await classifyDomain('user@protonmail.com')).toEqual({ companyDomain: null })
  })
})

describe('classifyDomain — company email domains', () => {
  it('returns the domain for a company email', async () => {
    expect(await classifyDomain('priya@razorpay.com')).toEqual({ companyDomain: 'razorpay.com' })
  })

  it('returns the domain for another company email', async () => {
    expect(await classifyDomain('alice@stripe.com')).toEqual({ companyDomain: 'stripe.com' })
  })

  it('returns the domain lowercased regardless of input case', async () => {
    expect(await classifyDomain('Bob@Acme.COM')).toEqual({ companyDomain: 'acme.com' })
  })
})

describe('classifyDomain — edge cases', () => {
  it('returns null when there is no @ in the string', async () => {
    expect(await classifyDomain('notanemail')).toEqual({ companyDomain: null })
  })

  it('returns null for an empty string', async () => {
    expect(await classifyDomain('')).toEqual({ companyDomain: null })
  })

  it('handles capital letters in the blocked domain lookup', async () => {
    expect(await classifyDomain('user@Gmail.COM')).toEqual({ companyDomain: null })
  })
})
