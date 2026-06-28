-- D-24: add first_identified_at to aliases — the canonical identification seam.
-- Immutable after INSERT: never updated by ON CONFLICT SET in processEvent.
-- Required by the journey view (D-23) to place the pre-/post-login seam at the
-- correct point in the event timeline, regardless of later re-identify calls.
ALTER TABLE aliases
  ADD COLUMN IF NOT EXISTS first_identified_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows: use updated_at as the best available approximation.
-- For users who have re-identified since their first login, updated_at is later
-- than the true first_identified_at — this is documented in PRD-v0.3.md §Further Notes.
UPDATE aliases SET first_identified_at = updated_at;
