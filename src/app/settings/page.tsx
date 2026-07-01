import type { Metadata } from 'next'
import Link from 'next/link'
import { listKeyEvents } from '@/lib/keyEvents'
import { listBlockedDomains } from '@/lib/blockedDomains'
import { getLlmKeyHint, getLlmProviderConfig } from '@/lib/llmSettings'
import { listRules } from '@/lib/readinessEngine'
import { getOutreachSettings } from '@/lib/outreachDraft'
import { listTriggerRules } from '@/lib/triggerEngine'
import { listSuppressions } from '@/lib/suppressionList'
import { getReplaySettings, CURRENT_CLAUSE_VERSION } from '@/lib/replay/consentGate'
import {
  addKeyEventAction, deleteKeyEventAction,
  addBlockedDomainAction, removeBlockedDomainAction,
  saveLlmConfigAction, addRuleAction, deleteRuleAction,
  saveOutreachSettingsAction, saveVoiceSampleAction, deleteVoiceSampleAction,
  addTriggerRuleAction, deleteTriggerRuleAction,
  addSuppressionAction, removeSuppressionAction,
  enableReplayAction, disableReplayAction,
  updateReplayRetentionAction, updateReplaySampleRateAction,
} from './actions'
import { VerifyKeyButton } from './VerifyKeyButton'
import { ReplayEnableForm } from './ReplayEnableForm'
import AppShell from '@/components/AppShell'
import Card from '@/components/Card'
import Badge from '@/components/Badge'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic',  models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'] },
  { value: 'openai',    label: 'OpenAI',      models: ['gpt-4o-mini', 'gpt-4o'] },
  { value: 'groq',      label: 'Groq',        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
]

/* ── Shared form field styles ── */
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--color-ink-3)',
  marginBottom: '0.375rem',
  letterSpacing: '0.02em',
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-line)',
  borderRadius: '8px',
  padding: '0.5625rem 0.875rem',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  outline: 'none',
}

const monoFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8125rem',
}

const submitStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#fff',
  background: 'var(--color-accent)',
  border: 'none',
  padding: '0.5rem 1.125rem',
  borderRadius: '9px',
  cursor: 'pointer',
  letterSpacing: '-0.01em',
}

const removeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--color-red)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
}

/* ── Section wrapper ── */
function Section({ title, subtitle, children, action }: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
              marginBottom: subtitle ? '0.25rem' : 0,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-3)', lineHeight: 1.45 }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ── List row ── */
function ListRow({ label, sub, removeAction }: {
  label: React.ReactNode
  sub?: string
  removeAction: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.125rem',
        borderBottom: '1px solid var(--color-line)',
        gap: '1rem',
      }}
    >
      <div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-ink)' }}>{label}</div>
        {sub && <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)', marginTop: '0.125rem', fontFamily: 'var(--font-mono)' }}>{sub}</p>}
      </div>
      {removeAction}
    </div>
  )
}

export default async function SettingsPage() {
  const [keyEvents, blockedDomains, rules, outreachSettings, triggerRules, suppressions, replaySettings] = await Promise.all([
    listKeyEvents(),
    listBlockedDomains(),
    listRules(),
    getOutreachSettings(),
    listTriggerRules(),
    listSuppressions(),
    getReplaySettings(),
  ])
  const llmKeyHint = getLlmKeyHint()
  const { provider: currentProvider, model: currentModel } = getLlmProviderConfig()

  return (
    <AppShell maxWidth="52rem">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
          }}
        >
          Settings
        </h1>
      </div>

      {/* ── LLM ── */}
      <Section
        title="LLM"
        subtitle="Your API key — stays on your server, never sent to ours."
        action={llmKeyHint ? (
          <Link href="/ask" style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Open Ask →
          </Link>
        ) : undefined}
      >
        <Card>
          {llmKeyHint ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                background: 'rgba(91,122,70,0.08)',
                border: '1px solid rgba(91,122,70,0.2)',
                borderRadius: '8px',
                marginBottom: '1.25rem',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-ink-2)' }}>
                Key configured: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{llmKeyHint}</code>
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                background: 'rgba(180,121,31,0.08)',
                border: '1px solid rgba(180,121,31,0.2)',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                color: 'var(--color-amber)',
              }}
            >
              No LLM key set — Ask is unavailable.
            </div>
          )}

          <form action={saveLlmConfigAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={labelStyle}>API key</label>
              <input type="password" name="llm_key" placeholder="sk-ant-… or sk-…" style={monoFieldStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label style={labelStyle}>Provider</label>
                <select name="llm_provider" defaultValue={currentProvider} style={fieldStyle}>
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Model</label>
                <select name="llm_model" defaultValue={currentModel} style={fieldStyle}>
                  {PROVIDERS.flatMap(p => p.models).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <button type="submit" style={submitStyle}>Save to .env.local</button>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>Restart the server after saving.</p>
            </div>
          </form>

          {llmKeyHint && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-line)' }}>
              <VerifyKeyButton />
            </div>
          )}
        </Card>
      </Section>

      {/* ── Readiness rules ── */}
      <Section
        title="Readiness rules"
        subtitle={<>Define what "ready to pay" means. Each rule is one typed condition. <Link href="/accounts" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>View accounts →</Link></>}
      >
        <Card padding="0" style={{ marginBottom: '1rem' }}>
          {rules.length === 0 ? (
            <p style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--color-ink-3)' }}>No rules defined yet.</p>
          ) : (
            rules.map((r, i) => (
              <ListRow
                key={r.id}
                label={<span style={{ fontWeight: 600 }}>{r.label}</span>}
                sub={`${r.signal} ${r.operator} ${r.threshold}${r.window_days ? ` (${r.window_days}d)` : ''}${r.event_name ? ` — ${r.event_name}` : ''}`}
                removeAction={
                  <form action={deleteRuleAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" style={removeStyle}>Remove</button>
                  </form>
                }
              />
            ))
          )}
        </Card>

        <Card>
          <form action={addRuleAction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Label</label>
              <input name="label" required placeholder="Active users ≥ 3 (last 30d)" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Signal</label>
              <select name="signal" style={fieldStyle}>
                <option value="active_users">Active users</option>
                <option value="total_events">Total events</option>
                <option value="days_since_active">Days since active</option>
                <option value="key_event_fired">Key event fired</option>
                <option value="days_in_product">Days in product</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Operator</label>
              <select name="operator" style={fieldStyle}>
                <option value=">=">≥ (at least)</option>
                <option value="<=">≤ (at most)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Threshold</label>
              <input name="threshold" type="number" required min="0" defaultValue="3" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Window (days, optional)</label>
              <input name="window_days" type="number" min="1" placeholder="30" style={fieldStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Event name (key_event_fired only)</label>
              <input name="event_name" placeholder="payment_intent" style={monoFieldStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" style={submitStyle}>Add rule</button>
            </div>
          </form>
        </Card>
      </Section>

      {/* ── Key events ── */}
      <Section
        title="Key events"
        subtitle="Mark events that signal meaningful milestones — e.g. payment_succeeded."
      >
        <form action={addKeyEventAction} style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.875rem' }}>
          <input type="text" name="name" required placeholder="event_name" maxLength={200} style={{ ...monoFieldStyle, flex: 1 }} />
          <button type="submit" style={submitStyle}>Add</button>
        </form>
        <Card padding="0">
          {keyEvents.length === 0 ? (
            <p style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--color-ink-3)' }}>No key events defined.</p>
          ) : (
            keyEvents.map(e => (
              <ListRow
                key={e.name}
                label={<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{e.name}</span>}
                removeAction={
                  <form action={deleteKeyEventAction}>
                    <input type="hidden" name="name" value={e.name} />
                    <button type="submit" style={removeStyle}>Remove</button>
                  </form>
                }
              />
            ))
          )}
        </Card>
      </Section>

      {/* ── Outreach ── */}
      <Section
        title="Outreach"
        subtitle={<>Slack webhook and per-domain send cooldown. <Link href="/outreach" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>View queue →</Link></>}
      >
        <Card>
          <form action={saveOutreachSettingsAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={labelStyle}>Slack incoming webhook URL</label>
              <input type="url" name="slack_webhook_url" defaultValue={outreachSettings.slack_webhook_url ?? ''} placeholder="https://hooks.slack.com/services/…" style={monoFieldStyle} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)', marginTop: '0.375rem' }}>Stored server-side — never exposed in the browser.</p>
            </div>
            <div>
              <label style={labelStyle}>Send cooldown (days)</label>
              <input type="number" name="cooldown_days" defaultValue={outreachSettings.cooldown_days} min="1" style={{ ...fieldStyle, width: '8rem' }} />
            </div>
            <div>
              <button type="submit" style={submitStyle}>Save outreach settings</button>
            </div>
          </form>
        </Card>
      </Section>

      {/* ── Founder voice ── */}
      <Section
        title="Founder voice"
        subtitle="2–5 sentences of your own writing. C-thru matches the tone. Optional."
      >
        <Card>
          {outreachSettings.voice_sample ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, marginBottom: '0.5rem' }}>Current sample</p>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                  color: 'var(--color-ink-2)',
                  lineHeight: 1.6,
                  background: 'var(--color-paper-2)',
                  borderRadius: '8px',
                  padding: '0.875rem',
                  margin: 0,
                }}
              >
                {outreachSettings.voice_sample}
              </pre>
              <form action={deleteVoiceSampleAction} style={{ marginTop: '0.625rem' }}>
                <button type="submit" style={{ ...removeStyle, fontSize: '0.8125rem' }}>
                  Delete voice sample (permanent)
                </button>
              </form>
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-3)', marginBottom: '1.25rem' }}>No voice sample saved.</p>
          )}
          <form action={saveVoiceSampleAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <textarea
              name="voice_sample"
              rows={4}
              placeholder="Hey, I noticed your team has been using the product a lot lately — wanted to reach out and see if there's anything I can do to help."
              style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <div>
              <button type="submit" style={submitStyle}>Save voice sample</button>
            </div>
          </form>
        </Card>
      </Section>

      {/* ── Trigger rules ── */}
      <Section
        title="Trigger rules"
        subtitle="When an account crosses a threshold, C-thru creates a draft — it never sends automatically."
      >
        <Card padding="0" style={{ marginBottom: '1rem' }}>
          {triggerRules.length === 0 ? (
            <p style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--color-ink-3)' }}>No trigger rules defined.</p>
          ) : (
            triggerRules.map(r => (
              <ListRow
                key={r.id}
                label={<span style={{ fontWeight: 600 }}>{r.label}</span>}
                sub={`when ${r.rules_met_min}/${r.rules_total} rules met`}
                removeAction={
                  <form action={deleteTriggerRuleAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" style={removeStyle}>Remove</button>
                  </form>
                }
              />
            ))
          )}
        </Card>
        <Card>
          <form action={addTriggerRuleAction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Label</label>
              <input name="label" required placeholder="Ready to close — 4/5 rules met" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Minimum rules met</label>
              <input name="rules_met_min" type="number" required min="1" defaultValue="4" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Out of (total rules)</label>
              <input name="rules_total" type="number" required min="1" defaultValue="5" style={fieldStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" style={submitStyle}>Add trigger rule</button>
            </div>
          </form>
        </Card>
      </Section>

      {/* ── Suppression list ── */}
      <Section
        title="Suppression list"
        subtitle="Hard blocks — no draft will be created for these domains or emails."
      >
        <Card padding="0" style={{ marginBottom: '1rem' }}>
          {suppressions.filter(s => !s.removed_at).length === 0 ? (
            <p style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--color-ink-3)' }}>No suppressed domains or emails.</p>
          ) : (
            suppressions.filter(s => !s.removed_at).map(s => (
              <ListRow
                key={s.id}
                label={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge color="neutral">{s.entry_type}</Badge>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{s.value}</span>
                  </div>
                }
                removeAction={
                  <form action={removeSuppressionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      style={removeStyle}
                      onClick={e => {
                        if (!confirm('This person asked not to be contacted. Removing them allows C-thru to draft outreach again. Are you sure?')) {
                          e.preventDefault()
                        }
                      }}
                    >
                      Remove
                    </button>
                  </form>
                }
              />
            ))
          )}
        </Card>
        <Card>
          <form action={addSuppressionAction} style={{ display: 'flex', gap: '0.625rem' }}>
            <select name="entry_type" style={{ ...fieldStyle, width: 'auto', flexShrink: 0 }}>
              <option value="email">Email</option>
              <option value="domain">Domain</option>
            </select>
            <input name="value" required placeholder="person@company.com or company.com" style={{ ...monoFieldStyle, flex: 1 }} />
            <button type="submit" style={{ ...submitStyle, whiteSpace: 'nowrap' }}>Add</button>
          </form>
        </Card>
      </Section>

      {/* ── Session Replay ── */}
      <Section
        title="Session replay"
        subtitle={
          <>
            Record user sessions to understand why users hesitate or drop off.
            Off by default — enabling requires acknowledging your disclosure obligations.
            {replaySettings.enabled && (
              <> <Link href="/replay" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>View recordings →</Link></>
            )}
          </>
        }
      >
        {replaySettings.enabled ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                background: 'rgba(91,122,70,0.08)',
                border: '1px solid rgba(91,122,70,0.2)',
                borderRadius: '10px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block', flexShrink: 0 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-2)' }}>
                Session replay is <strong>enabled</strong>.
                {replaySettings.acknowledgedAt && (
                  <> Acknowledged {replaySettings.acknowledgedAt.toLocaleDateString()} (clause v{replaySettings.acknowledgedClauseVersion}).</>
                )}
              </p>
            </div>

            {/* Retention */}
            <form action={updateReplayRetentionAction} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.625rem' }}>
              <div>
                <label style={labelStyle}>Retention (days)</label>
                <input name="retention_days" type="number" min="1" defaultValue={replaySettings.retentionDays} style={{ ...fieldStyle, width: '7rem' }} />
              </div>
              <button type="submit" style={submitStyle}>Save</button>
            </form>

            {/* Sample rate */}
            <form action={updateReplaySampleRateAction} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.625rem' }}>
              <div>
                <label style={labelStyle}>Sample rate (0.0 – 1.0)</label>
                <input name="sample_rate" type="number" min="0" max="1" step="0.01" defaultValue={replaySettings.sampleRate} style={{ ...fieldStyle, width: '7rem' }} />
              </div>
              <button type="submit" style={submitStyle}>Save</button>
            </form>

            {/* Disable */}
            <form action={disableReplayAction} style={{ borderTop: '1px solid var(--color-line)', paddingTop: '1rem' }}>
              <button type="submit" style={{ ...removeStyle, fontSize: '0.875rem' }}>
                Disable session replay
              </button>
            </form>
          </Card>
        ) : (
          <Card>
            <ReplayEnableForm
              enableAction={enableReplayAction}
              clauseVersion={CURRENT_CLAUSE_VERSION}
              retentionDays={replaySettings.retentionDays}
            />
          </Card>
        )}
      </Section>

      {/* ── Blocked domains ── */}
      <Section
        title="Blocked domains"
        subtitle="Emails from these domains are treated as personal and excluded from company grouping."
      >
        <form action={addBlockedDomainAction} style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.875rem' }}>
          <input type="text" name="domain" required placeholder="gmail.com" style={{ ...monoFieldStyle, flex: 1 }} />
          <button type="submit" style={submitStyle}>Add</button>
        </form>
        <Card padding="0">
          {blockedDomains.length === 0 ? (
            <p style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--color-ink-3)' }}>No blocked domains.</p>
          ) : (
            blockedDomains.map(domain => (
              <ListRow
                key={domain}
                label={<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{domain}</span>}
                removeAction={
                  <form action={removeBlockedDomainAction}>
                    <input type="hidden" name="domain" value={domain} />
                    <button type="submit" style={removeStyle}>Remove</button>
                  </form>
                }
              />
            ))
          )}
        </Card>
      </Section>
    </AppShell>
  )
}
