import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDraft, getOutreachSettings, getTopUsers, scanUngroundedClaims } from '@/lib/outreachDraft'
import { scoreCompany } from '@/lib/readinessEngine'
import { DraftActions } from './DraftActions'
import AppShell from '@/components/AppShell'
import Card from '@/components/Card'
import Badge from '@/components/Badge'

export const dynamic = 'force-dynamic'

function displayName(domain: string): string {
  const stripped = domain.replace(/\.(com|io|co|net|org|ai|app|dev|so|xyz)$/, '')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const draft = await getDraft(Number(id))
  return { title: draft ? `Outreach — ${displayName(draft.domain)}` : 'Outreach' }
}

export default async function DraftReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ warning?: string }>
}) {
  const { id } = await params
  const { warning } = await searchParams
  const draftId = Number(id)

  const [draft, settings] = await Promise.all([getDraft(draftId), getOutreachSettings()])
  if (!draft) notFound()

  const [score, topUsers] = await Promise.all([
    scoreCompany(draft.domain),
    getTopUsers(draft.domain),
  ])

  const warnings = scanUngroundedClaims(draft.draft_text)
  const defaultRecipient = topUsers[0]?.email ?? ''
  const voiceMode = settings.voice_sample
    ? 'Drafted in your voice'
    : 'Generic tone — add a voice sample in Settings to personalise'
  const isDone = draft.status !== 'pending'

  return (
    <AppShell maxWidth="52rem">
      {/* ── Breadcrumb ── */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.75rem', fontSize: '0.8125rem' }}>
        <Link href="/outreach" style={{ color: 'var(--color-ink-3)', textDecoration: 'none' }}>Outreach</Link>
        <span style={{ color: 'var(--color-line)' }}>/</span>
        <span style={{ color: 'var(--color-ink-2)' }}>{displayName(draft.domain)}</span>
      </nav>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.875rem',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
              }}
            >
              {displayName(draft.domain)}
            </h1>
            {draft.created_by === 'trigger' && <Badge color="accent">Triggered</Badge>}
            {isDone && <Badge color={draft.status === 'sent' ? 'green' : 'neutral'}>{draft.status}</Badge>}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-ink-3)' }}>{draft.domain}</p>
        </div>
      </div>

      {/* ── Cooldown warning ── */}
      {warning && (
        <Card
          style={{
            background: 'rgba(180,121,31,0.06)',
            border: '1px solid rgba(180,121,31,0.25)',
            marginBottom: '1.25rem',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--color-amber)' }}>⚠ {decodeURIComponent(warning)}</p>
        </Card>
      )}

      {/* ── Readiness context ── */}
      {score && (
        <Card style={{ marginBottom: '1.25rem' }}>
          <p
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-3)',
              marginBottom: '0.75rem',
            }}
          >
            Readiness context
          </p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.875rem' }}>
            {score.rulesMet}/{score.rulesTotal} rules met
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {score.breakdown.map(r => (
              <div key={r.ruleId} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                <span style={{ color: r.passed ? 'var(--color-green)' : 'var(--color-ink-3)', flexShrink: 0 }}>
                  {r.passed ? '✓' : '✗'}
                </span>
                <span style={{ color: 'var(--color-ink-2)' }}>{r.label}</span>
                <span style={{ color: 'var(--color-ink-3)' }}>— {r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Ungrounded claim warnings ── */}
      {warnings.length > 0 && (
        <Card
          style={{
            background: 'rgba(163,70,47,0.05)',
            border: '1px solid rgba(163,70,47,0.2)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {warnings.map((w, i) => (
              <p key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-red)' }}>
                ⚠ {w}
              </p>
            ))}
          </div>
        </Card>
      )}

      {/* ── Voice mode badge ── */}
      <p
        style={{
          fontSize: '0.8125rem',
          fontStyle: 'italic',
          color: 'var(--color-ink-3)',
          marginBottom: '1.25rem',
        }}
      >
        {voiceMode}
      </p>

      {/* ── Draft area ── */}
      {isDone ? (
        <Card>
          <p
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-3)',
              marginBottom: '0.75rem',
            }}
          >
            Draft
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9375rem',
              color: 'var(--color-ink-2)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {draft.draft_text}
          </pre>
        </Card>
      ) : (
        <DraftActions
          draftId={draft.id}
          initialText={draft.draft_text}
          defaultRecipient={defaultRecipient}
          hasSlack={!!settings.slack_webhook_url}
        />
      )}
    </AppShell>
  )
}
