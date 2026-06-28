# PRD — C-thru v0.3: Readiness Engine

> Scope: v0.3 only. Everything v0.4 and later is explicitly out of scope.
> Definition of done: a founder opens the dashboard and sees companies ranked by readiness,
> each with a plain-English summary and a per-rule ✓/✗ breakdown; they can view a funnel
> showing step-by-step conversion (user and company modes); and they can click any user to
> see their full event timeline including pre-login activity with an identification seam.
> Implementation decisions reference docs/DECISIONS.md entries (D-19 through D-24).

---

## The Spine (extended to v0.3)

> **Structure enforces honesty — not prompts.**
>
> In v0.2, the LLM authors SQL only; everything the founder sees as truth is validated
> deterministically. In v0.3 the same principle extends to the morning brief and to scoring:
> **no LLM is in the brief path.** The readiness score is a deterministic fraction from
> typed rule evaluations. The morning brief is a deterministic template from a structured
> fact payload. A template cannot hallucinate causation. A prompted LLM — however well
> instructed — can smuggle in "suggests they're evaluating" through word choice. On the
> screen the founder uses to decide who to email, robotic-but-true is the only acceptable
> register.
>
> The v0.3 trust mechanism for scores is the per-rule breakdown — the same role "show the
> SQL" plays in v0.2. A score without a breakdown is an opaque number. A score with a
> ✓/✗ breakdown per rule per company is a transparent verdict the founder can audit,
> correct, or override.

---

## Problem Statement

A PLG founder using C-thru after v0.2 has real data (v0.1) and can query it in plain
English (v0.2). But two gaps remain:

**Gap 1 — No ranked "who to act on" list.** The founder still has to manually work out
which accounts are ready to pay. They might ask `/ask` "which companies have 3+ active
users?" and look at the table, then "which of those fired the paywall event?", cross-reference
by hand, and repeat. The signal is in the data; the synthesis is not.

**Gap 2 — No way to trace the path.** The founder can count events and group by company,
but they cannot see how users move through their product — which step in the onboarding
funnel breaks, or exactly what a specific user did before they converted (or didn't). Without
the path, they can see *that* something happened but not *how* or *why*.

The consequence: a founder who has instrumented their product well still spends significant
time each morning manually constructing the "who to reach out to today" answer — using
v0.2 questions, clipboard, and intuition. C-thru has the data. v0.3 delivers the answer.

---

## Solution

C-thru v0.3 adds the Readiness Engine layer on top of v0.1 and v0.2.

The founder defines readiness rules from a constrained form UI — no SQL, five typed signal
types, one condition per rule. C-thru scores every company live on each dashboard load using
five batched GROUP BY queries across all companies. The accounts view ranks companies by score
with a full per-rule ✓/✗ breakdown visible per company — the audit trail that makes each score
trustworthy. Every morning the founder sees a brief: one template-generated sentence per ready
account, with the top 3 most active users named ("email Priya — 47 events in 7 days"), pulled
directly from `active_users_v`.

The founder can also build funnels from ordered event names to see where users drop off —
in user mode (how many individuals complete each step) and company mode (how many accounts
reach each step). Event names are validated before the query runs so a typo never silently
produces a misleading 0%.

The single-user journey view shows the full chronological event timeline for one person,
including everything they did before they identified — pre-login pageviews attributed via the
`aliases` join — with a visual seam at the exact moment `identify()` was called. The seam
is computed from `aliases.first_identified_at`, a new immutable column added in v0.3 as a
prerequisite (D-24).

---

## User Stories

### Schema Prerequisite — aliases.first_identified_at (D-24)

1. As a system, I want a migration to add `first_identified_at TIMESTAMPTZ NOT NULL DEFAULT now()` to the `aliases` table, so that the identification moment is recorded precisely and never changes.
2. As a system, I want existing `aliases` rows to be backfilled with `first_identified_at = updated_at` inside the migration, so that existing data has the best available approximation without manual intervention.
3. As a system, I want `processEvent` to include `first_identified_at = now()` on the `INSERT INTO aliases` statement and to leave `first_identified_at` absent from the `ON CONFLICT DO UPDATE SET` clause, so that the very first identify() call sets the canonical seam and no subsequent identify() call — from a second device, an updated email, a re-login — ever moves it.
4. As a founder, I want my ability to identify users on multiple devices to work exactly as before — last-write-wins on `user_id`, `email`, and `company_domain` — with no change in behavior, so that D-24 is purely additive and the existing alias contract is preserved.

### Readiness Rule CRUD

5. As a founder, I want a Settings section titled "Readiness Rules" where I can see all current rules in a list, so that I know at a glance what signals drive my account scoring.
6. As a founder, I want to create a new rule by filling in a form constrained to the five signal types (active users, total events, days since active, key event fired, days in product), so that I cannot accidentally define a rule that is syntactically valid but semantically wrong or unsafely expressive.
7. As a founder, I want the rule form to guide me through the fields for the selected signal type — for "key event fired" it asks for an event name (validated against distinct names in my data); for threshold-based signals it asks for operator (≥, ≤), threshold number, and window in days — so that I make correct entries without needing to know the underlying query structure.
8. As a founder, I want to give each rule a human-readable label (e.g. "Active users ≥ 3 (last 30d)"), so that the per-rule breakdown in the accounts view is immediately readable without decoding the signal parameters.
9. As a founder, I want five default rules pre-seeded when I first run v0.3 — one for each signal type with sensible defaults — so that readiness scoring works out of the box without needing to define rules from scratch.
10. As a founder, I want to edit the threshold, window, or event name of an existing rule, so that I can tune the defaults to match my product's actual conversion signals.
11. As a founder, I want to delete a rule, so that I can remove signals that don't apply to my product.
12. As a founder, I want the rule list to show each rule's signal type, label, and parameters in plain English (e.g. "Total events ≥ 20 in the last 7 days"), so that the scoring definition is transparent and auditable without any technical knowledge.

### The Five Typed Signals (D-19)

13. As a founder, I want to define a rule on "Active identified users in last N days" — queried as `COUNT(DISTINCT user_id) FROM active_users_v WHERE company_domain = ? AND last_event_at >= NOW() - INTERVAL 'N days'` — so that I can set a minimum user-activity threshold for readiness.
14. As a founder, I want to define a rule on "Total events in last N days" — queried as `COUNT(*) FROM events_v WHERE company_domain = ? AND received_at >= NOW() - INTERVAL 'N days'` — so that I can set a minimum product-engagement threshold.
15. As a founder, I want to define a rule on "Days since last activity" — derived from `company_activity_v.last_event_at` — so that I can require that a company was active within a recent window (e.g. "active in last 14 days").
16. As a founder, I want to define a rule on "Key event fired" — queried as `EXISTS (SELECT 1 FROM events_v WHERE company_domain = ? AND name = ?)` — so that I can require that a specific meaningful event (e.g. `payment_intent`, `invited_teammate`) was fired at least once by anyone at the company.
17. As a founder, I want to define a rule on "Days in product" — derived from `MIN(signed_up_at) FROM signups_v WHERE company_domain = ?` — so that I can filter for companies that have been using the product long enough to have formed a real opinion (e.g. "≥ 7 days since first signup").
18. As a founder, I want C-thru to reject any attempt to define a rule outside these five typed signals — no free-form SQL conditions, no JSONB property predicates — so that the guarantee "every query this engine runs is one of five known-safe patterns" is enforced structurally and cannot be bypassed by accident or intent.

### Live Company Scoring (D-21)

19. As a founder, I want the readiness score for all companies to be computed live on each dashboard load — not from a stale cache — so that the score and the underlying event data always agree and I never see a score that reflects a blocklist or rule state from a previous session.
20. As a founder, I want the live scoring to run as 5 batched GROUP BY queries across all companies — not as 5 queries per company in a loop — so that the computation time scales with signal count (fixed at 5), not company count.
21. As a founder, I want the readiness score displayed as a fraction (`rules_met / rules_total`, e.g. "3/5") with a short context line ("3 of 5 rules met"), so that I understand what the score means without any definition.
22. As a founder, I want equal weighting to be applied — each rule contributes 1 point regardless of which signal it tests — so that the scoring formula is simple, transparent, and matches what I read in the rule list. I understand that rule selection is the implicit weighting mechanism: if `payment_intent` matters most, I define more rules around it.

### Per-Rule ✓/✗ Breakdown — the Trust Mechanism (D-19)

23. As a founder, I want the per-rule breakdown for each company to be visible (either inline or on expand) in the accounts view, so that I can see exactly which rules each company met and which it didn't — the audit trail that makes the score trustworthy.
24. As a founder, I want each rule in the breakdown to show: the rule label, pass (✓) or fail (✗), and the actual computed value ("5 users", "47 events", "never fired", "3 days ago"), so that a failed rule tells me not just that it failed but how far from the threshold the company is.
25. As a founder, I want the breakdown to render correctly for a company that meets all rules (all ✓) and for a company that meets none (all ✗), so that edge cases are legible.
26. As a founder, I want the breakdown to be computed server-side as structured data and returned with the score — not derived by an LLM or inferred client-side — so that every number in the breakdown corresponds to an actual query result.

### Accounts Ranked by Readiness

27. As a founder, I want a dedicated "Accounts" view (accessible from the main navigation) showing all companies with known email-domain users, ranked by readiness score descending, so that the most ready accounts appear at the top — "who to act on today" is the first thing I see.
28. As a founder, I want the accounts list to show for each company: the domain (formatted as a display name per D-08), the readiness fraction, the score bar, and the top 1–2 active users (email), so that I can read off who to contact at a glance without clicking into the detail.
29. As a founder, I want to filter the accounts list by minimum score ("show only ≥ 3/5"), so that I can focus on accounts that are meaningfully close to conversion without seeing every low-signal company.
30. As a founder, I want to click on any company in the accounts list to see the full per-rule breakdown for that company, so that I can audit the score before acting.
31. As a founder, I want the accounts list to update on each page load with live scores — the same live computation that powers the morning brief — so that the list always reflects the current state of my data.

### Morning Brief — Deterministic Template (D-20)

32. As a founder, I want a "Morning Brief" page (or dashboard section) that shows one template-generated sentence per company that meets all readiness rules, so that I can see the ready accounts in a readable summary without opening each one.
33. As a founder, I want each brief entry to follow this template: `"[DisplayName] — [N] of [M] readiness signals met. [X] active users, [Y] events in [W] days, active [Z] days ago. [Has / Has not] fired [event_name]."` — populated entirely from deterministic `BriefFact` fields, with no text generated by an LLM, so that the sentence cannot contain inference, causation, or hallucinated context.
34. As a founder, I want each brief entry to list the top 3 most active identified users at that company (email and event count), sourced from `active_users_v ORDER BY total_events DESC LIMIT 3`, so that the brief is actionable: I know who specifically to contact rather than just that the company is ready.
35. As a founder, I want the top-user display to show first-party data only — emails the users themselves provided via `identify()`, not enriched or scraped data — so that the brief is factually grounded in what I already know.
36. As a founder, I want the morning brief to be generated on page load without any LLM call, so that the page renders fast, costs nothing from my LLM key, and is never blocked by an LLM outage or rate limit.
37. As a founder, I want the morning brief to show "No accounts meet all readiness rules yet" when the score for all companies is less than the total rule count, so that I have a clear, honest state when my rules are strict or my data is early.
38. As a founder, I want each company entry in the brief to link to that company's full per-rule breakdown and to each top user's journey view, so that I can go from "Razorpay is ready — email Priya" to Priya's full event timeline in one click.

### Funnels — Parameterized CTE Chain (D-22)

39. As a founder, I want a "Funnels" section where I can define a funnel by entering an ordered list of event names (e.g. `pageview → signup_completed → payment_intent → subscription_activated`), so that I can measure how many users or companies complete each step in sequence.
40. As a founder, I want funnel step event names to be validated against the actual distinct event names in my data before the funnel runs — using `SELECT name FROM events_v WHERE name = ANY($1::text[])` — so that a typo'd or never-fired event name is flagged as "this event has never been fired" rather than silently producing a 0% conversion step.
41. As a founder, I want the "never fired" warning to be shown per-step with the exact name I entered, so that I can immediately spot and fix the typo without having to diagnose a misleading zero.
42. As a founder, I want to switch between user mode and company mode for any funnel — user mode counts distinct users who complete each ordered step; company mode counts distinct companies that have at least one user completing the ordered chain — so that I can see both "how many individuals convert" and "how many accounts reach each milestone."
43. As a founder, I want funnel results to show for each step: the step label, the count (users or companies), and the conversion rate from both the previous step and step 1, so that I can see both step-to-step drop-off and overall funnel conversion at a glance.
44. As a founder, I want to scope a funnel to a single company (by domain) to see only that company's users in the funnel, so that I can investigate one account's specific path through my product.
45. As a founder, I want to see users who dropped off at a specific funnel step listed by name (email) when I click the drop-off count, so that I can reach out to or investigate specific individuals who stalled.
46. As a founder, I want to save a funnel definition (name + ordered steps) so that I can return to the same funnel without re-entering the steps, so that my key funnels are persistent across sessions.
47. As a founder, I want each user listed in funnel results to link to their journey view, so that I can trace exactly what happened to a specific individual after a step.

### Single-User Journey View (D-23)

48. As a founder, I want a `/journey/[userId]` page that shows the complete chronological event timeline for a specific user — all events in `received_at ASC` order — so that I can trace exactly what that user did in my product from first contact to today.
49. As a founder, I want pre-login events (where the user was anonymous before calling `identify()`) to appear in the timeline attributed to the identified user via the `aliases` join, so that I see the user's full history including everything they did before logging in.
50. As a founder, I want a visual seam in the timeline — rendered as a horizontal separator labeled "Identified as [email]" — placed at the exact point where `identify()` was first called for this user's anonymous session, so that I can see which events were anonymous and which were post-login.
51. As a founder, I want the identification seam to use `aliases.first_identified_at <= event.received_at` to determine whether each event is pre- or post-identification, so that the seam is placed at the actual moment identify() was called — not at the moment I'm loading the page — even if the user has since re-identified on another device.
52. As a founder, I want each event in the timeline to show: event name, `received_at` timestamp, and `company_domain` (if present), so that I can read the sequence of meaningful moments without noise.
53. As a founder, I want the journey view to be reachable from multiple surfaces without requiring context beyond the user ID: from the readiness breakdown's `topUsers` list, from `/ask` results that include a `user_id` column (each row links to the journey), and from funnel step drilldowns (users who completed or dropped at that step), so that the journey is a destination every surface can point to consistently.
54. As a founder, I want the journey page URL (`/journey/[userId]`) to work as a standalone link — with an optional `?company=[domain]` for back-navigation only — so that I can bookmark or share a specific user's journey and it opens correctly regardless of how I arrived at it.
55. As a founder, I want the journey view to show a "No events found" message if the user ID does not exist or has no events, so that a stale or incorrect link gives a clear, safe response.

---

## Implementation Decisions

### The Spine — Extended

The Spine from v0.2 ("LLM authors SQL only") now extends to the morning brief: the brief path has no LLM in it. Structure enforces honesty. The template function receives a `BriefFact` struct and produces a string — no model call, no prompt, no inference. Every number in the output must exist as a field in `BriefFact`. This is the same architectural reason `validateSql` was built instead of "prompt the LLM to stay safe": prompts are probabilistic controls; structural constraints are deterministic ones.

### Schema Changes

**Migration 007 — `aliases.first_identified_at` (D-24)**

```sql
ALTER TABLE aliases
  ADD COLUMN first_identified_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE aliases SET first_identified_at = updated_at;
```

The `DEFAULT now()` makes the column NOT NULL-safe for the ALTER without a separate backfill pass. The UPDATE immediately overwrites the `now()` default with the best available approximation (`updated_at`). No migration step requires app downtime.

**Migration 008 — `readiness_rules` table**

```sql
CREATE TABLE IF NOT EXISTS readiness_rules (
  id          SERIAL      PRIMARY KEY,
  label       TEXT        NOT NULL,
  signal      TEXT        NOT NULL
                          CHECK (signal IN ('active_users','total_events',
                                            'days_since_active','key_event_fired',
                                            'days_in_product')),
  operator    TEXT        NOT NULL CHECK (operator IN ('>=','<=')),
  threshold   NUMERIC     NOT NULL,
  window_days INT,
  event_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Five default rows seeded in the migration body — one per signal type with conservative thresholds (e.g. active_users ≥ 3 last 30d, total_events ≥ 20 last 7d, days_since_active ≤ 14, key_event_fired for the most common key event, days_in_product ≥ 7).

**Migration 009 — `funnels` and `funnel_steps` tables**

```sql
CREATE TABLE IF NOT EXISTS funnels (
  id         SERIAL      PRIMARY KEY,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funnel_steps (
  id         SERIAL      PRIMARY KEY,
  funnel_id  INT         NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  step_order INT         NOT NULL,
  event_name TEXT        NOT NULL,
  label      TEXT,
  UNIQUE (funnel_id, step_order)
);
```

No other schema changes. The `events`, `events_v`, `users`, `companies`, `aliases`, `signups_v`, `active_users_v`, `company_activity_v`, `key_events`, and `pinned_queries` tables are read-only from v0.3's perspective (except for the `aliases` column add).

### processEvent.ts — first_identified_at (D-24)

The alias upsert in `processEvent.ts` gains one column on INSERT and zero changes on conflict:

```sql
INSERT INTO aliases (anonymous_id, user_id, email, company_domain, updated_at, first_identified_at)
VALUES ($1, $2, $3, $4, now(), now())
ON CONFLICT (anonymous_id) DO UPDATE
  SET user_id        = COALESCE(EXCLUDED.user_id, aliases.user_id),
      email          = COALESCE(EXCLUDED.email, aliases.email),
      company_domain = EXCLUDED.company_domain,
      updated_at     = now()
  -- first_identified_at: intentionally absent — immutable after first insert
```

The existing contract of `processEvent` is unchanged: last-write-wins on `user_id`, `email`, `company_domain`. The new column is purely additive.

### Major Modules

**`lib/readinessEngine.ts` — scoring deep module (D-21)**

The core of v0.3. Single exported interface:

```typescript
interface RuleResult {
  ruleId: number
  label: string
  passed: boolean
  value: string        // human-readable: "5 users", "47 events", "never fired"
}

interface CompanyScore {
  domain: string
  rulesMet: number
  rulesTotal: number
  breakdown: RuleResult[]
}

async function scoreAllCompanies(): Promise<CompanyScore[]>
```

Internally, `scoreAllCompanies` runs the five batched GROUP BY queries — one per signal type — across all companies in a single pass, then joins the results with the rule list in memory. 200 companies = 5 queries. The in-memory join is O(companies × rules), negligible at self-hosted PLG scale.

**`lib/readinessEngine.ts` — `evaluateSignal` (D-21)**

The single tested seam for all query construction:

```typescript
async function evaluateSignal(
  rule: ReadinessRule,
  companyDomainMap: Map<string, unknown>
): Promise<boolean>
```

The `switch` on `rule.signal` lives inside this function. Each branch reads from a pre-computed company-domain map (populated by the batch queries) rather than issuing a per-company query. All five branches are unit-tested in isolation against seeded data.

**`lib/briefGenerator.ts` — deterministic morning brief (D-20)**

No LLM import. Pure function:

```typescript
interface BriefFact {
  domain: string
  displayName: string
  score: { met: number; total: number }
  rules: RuleResult[]
  topUsers: Array<{ email: string; eventCount: number }>  // max 3, from active_users_v
  daysSinceLastActive: number
  topKeyEventFired: string | null
}

function generateBriefSentence(fact: BriefFact): string
```

The template string is constructed from `BriefFact` fields only. No inference verbs ("suggests", "indicates", "likely", "because", "due to") appear in the output — structurally impossible because they are not in any field the template touches.

**`lib/funnelEngine.ts` — CTE chain generator (D-22)**

```typescript
async function validateFunnelSteps(
  eventNames: string[]
): Promise<{ valid: string[]; neverFired: string[] }>

async function evaluateFunnel(
  steps: string[],
  mode: 'user' | 'company',
  companyFilter?: string
): Promise<{ stepCounts: number[]; stepLabels: string[] }>
```

`validateFunnelSteps` runs one batched query: `SELECT name FROM events_v WHERE name = ANY($1::text[])`. Any input name absent from the result is `neverFired` — never-fired names are returned before the CTE runs, not after.

`evaluateFunnel` generates a CTE chain of N steps. Each step's event name is a `$N` bind parameter — never string-interpolated. The chain structure is generated by the function (trusted code); only the event name values are founder-supplied (bound). In `company` mode, `company_domain` is added to each step's SELECT and GROUP BY, and the final aggregate is `COUNT(DISTINCT company_domain)`.

**`lib/journeyEngine.ts` — user journey query (D-23)**

```typescript
interface JourneyEvent {
  name: string
  receivedAt: Date
  companyDomain: string | null
  anonymousId: string
  postIdentification: boolean
}

async function getUserJourney(userId: string): Promise<JourneyEvent[]>
```

The query:

```sql
WITH user_anons AS (
  SELECT anonymous_id, first_identified_at
  FROM aliases WHERE user_id = $1
)
SELECT
  e.name, e.received_at, e.company_domain, e.anonymous_id,
  (
    e.user_id = $1
    OR EXISTS (
      SELECT 1 FROM user_anons ua
      WHERE ua.anonymous_id = e.anonymous_id
        AND ua.first_identified_at <= e.received_at
    )
  ) AS post_identification
FROM events_v e
WHERE e.anonymous_id IN (SELECT anonymous_id FROM user_anons)
   OR e.user_id = $1
ORDER BY e.received_at ASC
```

The CTE resolves the user's anonymous_id set once. `post_identification` uses `first_identified_at <= received_at` — not alias existence — so pre-login events appear before the seam even though the alias row exists at query time.

### API Routes and Pages

- **`/api/readiness`** — GET, returns `CompanyScore[]` with full breakdowns. Called on dashboard load and accounts page load.
- **`/api/brief`** — GET, returns `BriefFact[]` for companies meeting all rules. Calls `scoreAllCompanies` + `active_users_v` top-user query per ready company + `generateBriefSentence` per company. No LLM call.
- **`/api/funnels`** — GET list; POST create; DELETE by id.
- **`/api/funnels/[id]/evaluate`** — POST `{ mode, companyFilter? }` → evaluates funnel, returns step counts after `validateFunnelSteps`.
- **`/api/journey/[userId]`** — GET, returns `JourneyEvent[]`.
- **`/accounts` page** — server component, calls `/api/readiness`, renders ranked list with inline breakdowns.
- **`/brief` page** — server component, calls `/api/brief`, renders template sentences with top users and links.
- **`/funnels` page** — client component (needs interactivity for step editing and mode toggle).
- **`/journey/[userId]` page** — server component, calls `/api/journey/[userId]`, renders timeline with identification seam.

---

## Testing Decisions

### What makes a good test here

Same principle as v0.1 and v0.2: test behavior through public interfaces. The primary seams are `evaluateSignal`, `evaluateFunnel`, `validateFunnelSteps`, `getUserJourney`, and `generateBriefSentence`. Tests must not assert on internal query strings or intermediate data structures — only on the observable outputs (score passed/failed, step counts, journey events in correct order, brief sentence content).

### D-24 — first_identified_at: regression-first

The `processEvent.ts` change touches v0.1 core code. The definition of done for this issue requires two test groups passing:

**Regression group (must all still pass — zero behavior change):** every existing test in `processEvent.test.ts` and `aliases.test.ts`. Last-write-wins on `user_id`, `email`, `company_domain` must be unchanged. This is not a new test — it is the pre-existing suite run against the modified code.

**New assertions:**
- `first_identified_at` is set on the first INSERT for a fresh `anonymous_id`.
- Calling processEvent again with the same `anonymous_id` but a different `user_id` (re-identify on a new device) does NOT change `first_identified_at`.
- `first_identified_at` is earlier than `updated_at` when re-identification has occurred.
- The backfill in the migration: after running migration 007 on a DB with existing aliases rows, all rows have `first_identified_at IS NOT NULL` and `first_identified_at = updated_at`.

### evaluateSignal — each branch in isolation

Five tests against seeded data, one per signal type:
- `active_users`: seed N identified users with events within/outside the window. Assert `passed = true` when count ≥ threshold, `false` otherwise. Assert `value` shows the count.
- `total_events`: same structure with event count.
- `days_since_active`: seed a company with a last event at a known timestamp. Assert pass/fail based on elapsed days.
- `key_event_fired`: seed events with/without the key event name. Assert pass when the event exists, fail with `value = "never fired"` when absent.
- `days_in_product`: seed signups at a known date. Assert pass/fail based on days since `MIN(signed_up_at)`.

### Live scoring — set-based, not looped

Assert that `scoreAllCompanies()` issues exactly 5 DB queries for any number of companies. Instrument the DB client in the test environment to count queries issued. Seed 3 different company domains, call `scoreAllCompanies()`, assert query count ≤ 5 (one per signal, plus rule list fetch). This prevents regression to a per-company loop.

### Funnel — event-name validation catches typos before query

- Seed events with name `payment_intent`. Call `validateFunnelSteps(['payment_intent', 'payment_intentt'])`. Assert `valid = ['payment_intent']`, `neverFired = ['payment_intentt']`.
- Assert `evaluateFunnel` is NOT called when `neverFired` is non-empty (the caller receives the validation result and must surface the error).

### Funnel — user mode vs company mode

Seed two users from the same company completing a 3-step funnel; one user from another company completing only steps 1–2.
- User mode: step 1 = 3 users (or however many), step 2 = 2, step 3 = 2.
- Company mode: step 1 = 2 companies, step 2 = 2 companies, step 3 = 1 company.

### Journey — seam renders correctly

Seed a user journey:
1. Anonymous event at T0 (`anon-a`, no user_id).
2. `identify()` at T1 linking `anon-a` to `user-x`.
3. Post-login event at T2.

Assert `getUserJourney('user-x')` returns 3 events in order. Assert T0 event has `postIdentification = false`. Assert T1 and T2 events have `postIdentification = true`.

### Journey — re-identify does not move the seam

Extend the above: add a second `identify()` call at T3 (simulating a second device for the same user). Assert T0 event still has `postIdentification = false` — `first_identified_at` was not moved by T3's upsert.

### generateBriefSentence — no inference verbs, no LLM

Source-level test (read the file, assert no LLM or AI SDK imports — same pattern as `interpretationLabel.test.ts`). Behavioral test: call `generateBriefSentence` with a known `BriefFact` and assert the output contains the exact score, user count, event count, and domain — no other claimed facts. Assert the output does not contain any of: "suggests", "indicates", "likely", "because", "due to", "evaluating", "interest".

### Prior art in the codebase

- `src/lib/__tests__/curatedViews.test.ts` — real-DB integration tests via `processEvent`; pattern for `evaluateSignal` and journey tests.
- `src/lib/__tests__/trendComputer.test.ts` — pure-function tests; pattern for `generateBriefSentence`.
- `src/lib/__tests__/interpretationLabel.test.ts` — source-level no-LLM assertion; repeat pattern for `briefGenerator.ts`.
- `src/lib/__tests__/setup.ts` — extend `TRUNCATE` list to include `readiness_rules`, `funnels`, `funnel_steps`; re-seed default rules from migration.

---

## Out of Scope

The following are explicitly NOT part of v0.3:

- **Rule weighting** — all rules contribute equally (1 point). Unequal weighting, configurable weights, or priority-ordered rules are v0.4+ scope. See D-19.
- **JSONB / property-based rules** — e.g. "key event fired WHERE properties.plan = 'pro'". Deferred permanently from rule-type scope; use `/ask` for property-filtered analysis.
- **Founder-written SQL rule conditions** — same rejection as JSONB rules; the typed signal constraint is the entire value of the engine.
- **Funnel property-filter steps** — funnel steps match on event name only. Property predicates in step conditions are v0.4+.
- **Event properties in the journey view** — the timeline shows name, timestamp, company_domain only. JSONB property display is v0.4+ (requires per-event-type schema to render meaningfully).
- **LLM involvement in the morning brief** — permanently excluded, not deferred. The template is the deliverable.
- **Predictive / ML-based scoring** — transparent typed rules only. ML scoring is not v0.3 or v0.4; it requires a labeled training dataset that does not exist yet.
- **v0.4 Act Loop** — drafted outreach, one-click send, set-once rules, outreach log.
- **v0.5 Session Replay** — DOM recording, replay player, field masking.
- **v0.6 Legal Enrichment** — company name/logo/size from external sources. Note: `BriefFact.topUsers` is first-party data display (emails the users provided themselves) — it is not enrichment and is in scope.
- **v1.0 Hosted Cloud** — multi-tenant, billing.
- **Company-level journey view** — showing all events aggregated across all users at a company. The journey view is per-user only. Use `/ask` or `company_activity_v` queries for company-level event analysis.
- **Identical-question caching for scoring** — no memoization of score results within a session. Live computation runs fresh on each load.

---

## Further Notes

**Why the per-rule breakdown is mandatory (D-19)**

A score without a breakdown is an opaque number — no better than a black-box AI confidence score. The breakdown is the mechanism that makes the score auditable. A founder who sees "Razorpay: 3/5" can guess; a founder who sees "✓ Active users ≥ 3, ✗ payment_intent never fired" knows exactly what happened and what to do about it (either reach out now or wait for the signal). This is the same principle as "show the SQL" in v0.2: verifiability is the trust mechanism, not the score itself.

**Why live computation scales correctly (D-21)**

At self-hosted PLG scale — tens to a few hundred company domains — 5 GROUP BY queries across all companies run in under 100ms on a local Postgres instance. The query count is fixed at 5 regardless of company count; the result set for each query is bounded by company count (small). There is no N+1 query problem because the signal queries return aggregated maps, not per-company round-trips. If a future deployment outgrows this, the fix is a materialized view or a scheduled precompute — a decision made when real performance data exists, not speculatively.

**Why `first_identified_at` is a prerequisite, not an optimization (D-24)**

Without `first_identified_at`, the journey view cannot place the identification seam correctly. `aliases.updated_at` moves on every re-identify call (last-write-wins, D-02). If a user logs in on a second device at T3, `updated_at` becomes T3, and every pre-login event at T0 would be classified as post-identification — the seam renders in the wrong place. A journey view with an incorrect seam is worse than no seam: it actively misleads the founder about when the user identified. The schema add is the smallest possible change (one immutable column, one conditional INSERT, one backfill) and must be complete before the journey view issue begins.

**Why the funnel CTE chain is correct for ordered conversion (D-22)**

The CTE chain structure (step N joins to step N-1 on `user_id` and `received_at > step(N-1).t`) enforces strict ordering: a user only reaches step N if they personally fired event N AFTER firing event N-1. This is the correct PLG funnel definition. It correctly handles: one user completing all steps (appears in all step counts), one user completing only steps 1–2 (appears in step 1 and 2 counts only), and users who fired events out of order (excluded from later steps). The GROUP BY `user_id` on each CTE's MIN ensures only the first occurrence of each step event counts — preventing a user who fires step 2 ten times from inflating the step 2 count.

**The `first_identified_at` backfill is honest about its approximation**

For existing rows, `first_identified_at = updated_at` is the best available data — it is the last time the alias was written, which for most rows in a working system is also the time of first identification (most users identify once). For users who have re-identified since their first login, `updated_at` will be later than the true first identification time, meaning their seam will render too late in the timeline. This is documented here so that: (a) no one mistakes the backfill for a precise historical reconstruction, and (b) new users after the migration will always have a correct seam.
