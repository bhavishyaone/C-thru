'use client'

import { useState, useTransition } from 'react'
import { sendSlackAction, recordCopyAction, dismissDraftAction } from '../actions'
import Card from '@/components/Card'

interface Props {
  draftId: number
  initialText: string
  defaultRecipient: string
  hasSlack: boolean
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-line)',
  borderRadius: '10px',
  padding: '0.625rem 0.875rem',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: '0.375rem',
}

export function DraftActions({ draftId, initialText, defaultRecipient, hasSlack }: Props) {
  const [text, setText] = useState(initialText)
  const [recipient, setRecipient] = useState(defaultRecipient)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSlack() {
    setError(null)
    const fd = new FormData()
    fd.set('draft_id', String(draftId))
    fd.set('recipient', recipient)
    fd.set('draft_text', text)
    startTransition(async () => {
      const result = await sendSlackAction(fd)
      if (result?.error) setError(result.error)
    })
  }

  function handleCopy() {
    setError(null)
    try { navigator.clipboard.writeText(text) } catch (_) {}
    setCopied(true)
    const fd = new FormData()
    fd.set('draft_id', String(draftId))
    fd.set('recipient', recipient)
    fd.set('draft_text', text)
    startTransition(async () => {
      const result = await recordCopyAction(fd)
      if (result?.error) setError(result.error)
    })
  }

  function handleDismiss() {
    setError(null)
    const fd = new FormData()
    fd.set('draft_id', String(draftId))
    startTransition(async () => {
      await dismissDraftAction(fd)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && (
        <Card
          style={{
            background: 'rgba(163,70,47,0.05)',
            border: '1px solid rgba(163,70,47,0.2)',
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-red)' }}>{error}</p>
        </Card>
      )}

      {/* Recipient */}
      <Card>
        <label style={labelStyle}>Recipient</label>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)', marginBottom: '0.625rem' }}>
          Pre-filled from the most active user. Edit before sending.
        </p>
        <input
          type="email"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="email@company.com"
          style={fieldStyle}
        />
      </Card>

      {/* Editable draft */}
      <Card>
        <label style={labelStyle}>Draft</label>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)', marginBottom: '0.625rem' }}>
          Edit freely. What you send is what goes out.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={9}
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.65 }}
        />
      </Card>

      {/* Actions — deliberate, never automatic */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {hasSlack && (
          <button
            onClick={handleSlack}
            disabled={pending}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: '#fff',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.25rem',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.5 : 1,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              letterSpacing: '-0.01em',
            }}
          >
            <span>↗</span> Send to Slack
          </button>
        )}

        <button
          onClick={handleCopy}
          disabled={pending}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--color-ink)',
            background: 'var(--color-card)',
            border: '1px solid var(--color-line)',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.5 : 1,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            letterSpacing: '-0.01em',
          }}
        >
          <span>{copied ? '✓' : '⎘'}</span>
          {copied ? 'Copied — paste into your email client' : 'Copy to clipboard'}
        </button>

        <button
          onClick={handleDismiss}
          disabled={pending}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-ink-3)',
            background: 'transparent',
            border: 'none',
            borderRadius: '10px',
            padding: '0.625rem 0',
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.5 : 1,
            textAlign: 'left',
          }}
        >
          Dismiss — not acting on this account right now
        </button>
      </div>

      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-ink-3)',
          borderTop: '1px solid var(--color-line)',
          paddingTop: '1rem',
        }}
      >
        Personal 1:1 outreach only. C-thru logs what you copy or send — not what happens in your inbox.
      </p>
    </div>
  )
}
