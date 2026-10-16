-- ═══════════════════════════════════════════════════════════════════════════
-- OrinChats - delivery mode is an explicit, stored value.
--
-- WHY: before this migration the delivery mode was *guessed* at send time from
-- the button fields (`button_link` present → link, `button_title` present →
-- reveal, neither → immediate). The configuration screen derived the same thing
-- with its own copy of the rule, so the stored row could not say what the user
-- actually wanted, and any leftover field silently changed the behavior of an
-- automation. This migration records the effective flow alongside the config.
--
-- HOW the app uses it today: the authoring screen is a single flow (the
-- open-autodm one - an opening message plus one optional button), and the button
-- fields are what it edits. This column is derived from those fields when saving
-- and is used as the fallback for rows whose button fields carry no signal.
--
-- SAFETY:
--  * additive only - no column is dropped, no row is deleted;
--  * idempotent - safe to re-run;
--  * the backfill reproduces EXACTLY the behavior each existing row has today,
--    so deploying this migration never changes what a live automation sends;
--  * reversible - see the rollback block at the bottom.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1: the explicit mode ───────────────────────────────────────────────────
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS dm_delivery_mode TEXT;

-- ── 2: backfill from the fields each row already uses (no behavior change) ──
UPDATE public.automations
SET dm_delivery_mode = CASE
    WHEN NULLIF(BTRIM(COALESCE(dm_opening_message_button_link, '')), '') IS NOT NULL THEN 'link'
    WHEN NULLIF(BTRIM(COALESCE(dm_opening_message_button_title, '')), '') IS NOT NULL THEN 'reveal'
    ELSE 'immediate'
  END
WHERE dm_delivery_mode IS NULL;

-- ── 3: constrain it ────────────────────────────────────────────────────────
UPDATE public.automations
SET dm_delivery_mode = 'immediate'
WHERE dm_delivery_mode IS NULL OR dm_delivery_mode NOT IN ('link', 'reveal', 'immediate');

ALTER TABLE public.automations
  ALTER COLUMN dm_delivery_mode SET DEFAULT 'immediate';

ALTER TABLE public.automations
  ALTER COLUMN dm_delivery_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.automations'::regclass
      AND conname = 'chk_automations_dm_delivery_mode'
  ) THEN
    ALTER TABLE public.automations
      ADD CONSTRAINT chk_automations_dm_delivery_mode
      CHECK (dm_delivery_mode IN ('link', 'reveal', 'immediate'));
  END IF;
END $$;

-- ── 4: explicit opt-in for the old auto-filled opening sentence ─────────────
-- Old editor builds wrote "Olá, aqui está o seu link! 💜" into the opening
-- field on their own. The worker treats that exact sentence as "not configured"
-- so it can never be sent automatically. A user who really wants it can opt in
-- per automation, which sets this flag - nothing is deleted either way.
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS dm_allow_legacy_opening BOOLEAN NOT NULL DEFAULT false;

-- ── Rollback (manual, non-destructive): ────────────────────────────────────
--   ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS chk_automations_dm_delivery_mode;
--   ALTER TABLE public.automations DROP COLUMN IF EXISTS dm_allow_legacy_opening;
--   ALTER TABLE public.automations ALTER COLUMN dm_delivery_mode DROP NOT NULL;
--   ALTER TABLE public.automations ALTER COLUMN dm_delivery_mode DROP DEFAULT;
--   ALTER TABLE public.automations DROP COLUMN IF EXISTS dm_delivery_mode;
-- (Dropping the column is safe: the worker derives the flow from the button
--  fields whenever dm_delivery_mode is absent.)
