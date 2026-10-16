-- ═══════════════════════════════════════════════════════════════════════════
-- OrinChats - per-message send state (`dm_send_log`).
--
-- WHY: the audit table only knew "the job ran" / "the job failed". For a flow
-- with an opening plus several responses there was no record of WHICH message
-- reached the person, so:
--   * a failure in message 3 could not be distinguished from a total failure,
--     and a retry could resend messages 1 and 2 (duplicates);
--   * the Meta message id was never stored;
--   * an ambiguous outcome (timeout / 5xx, delivery unknown) was indistinguishable
--     from a confirmed rejection.
--
-- One row per planned message, unique per (automation, trigger event, step).
-- That uniqueness IS the per-step idempotency guard: the worker claims the step
-- before sending, so a retried job finds the row and skips that message instead
-- of duplicating it.
--
-- SAFETY: purely additive. No existing table is modified or dropped.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dm_send_log (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_account_id  UUID        NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  automation_id         UUID        NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,

  trigger_user_id       TEXT        NOT NULL,
  trigger_event_id      TEXT        NOT NULL,

  -- `opening`, `response-1`, `followup-1-response-2`, …
  step_key              TEXT        NOT NULL,
  step_index            INTEGER     NOT NULL,
  source                TEXT        NOT NULL CHECK (source IN ('opening', 'response')),
  response_index        INTEGER,
  kind                  TEXT        NOT NULL,

  message_text          TEXT        NOT NULL,
  button_title          TEXT,
  button_url            TEXT,

  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed', 'ambiguous', 'skipped')),

  -- What Meta returned, when it returned something.
  provider_message_id   TEXT,
  error_code            INTEGER,
  http_status           INTEGER,
  error_message         TEXT,

  delivery_mode         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_dm_send_log_step UNIQUE (automation_id, trigger_event_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_dm_send_log_automation_event
  ON public.dm_send_log (automation_id, trigger_event_id, step_index);

CREATE INDEX IF NOT EXISTS idx_dm_send_log_created_at
  ON public.dm_send_log (created_at DESC);

-- Operations view: "did anything go out ambiguous / fail in the last day?".
CREATE INDEX IF NOT EXISTS idx_dm_send_log_status
  ON public.dm_send_log (status, created_at DESC)
  WHERE status IN ('failed', 'ambiguous');

ALTER TABLE public.dm_send_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dm_send_log'
      AND policyname = 'Users can view own dm send log'
  ) THEN
    CREATE POLICY "Users can view own dm send log"
      ON public.dm_send_log FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.automations a
        WHERE a.id = dm_send_log.automation_id AND a.user_id = auth.uid()
      ));
  END IF;
END $$;

-- ── Delivery mode + final state on the job audit row ───────────────────────
-- Makes "which mode ran, and what was the outcome" a single query.
ALTER TABLE public.dm_jobs
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT;

ALTER TABLE public.dm_jobs
  ADD COLUMN IF NOT EXISTS result_state TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.dm_jobs'::regclass
      AND conname = 'chk_dm_jobs_result_state'
  ) THEN
    ALTER TABLE public.dm_jobs
      ADD CONSTRAINT chk_dm_jobs_result_state
      CHECK (result_state IS NULL OR result_state IN
        ('delivered', 'partially_delivered', 'ambiguous', 'failed', 'skipped'));
  END IF;
END $$;

-- ── Rollback (manual, non-destructive of production content): ──────────────
--   ALTER TABLE public.dm_jobs DROP CONSTRAINT IF EXISTS chk_dm_jobs_result_state;
--   ALTER TABLE public.dm_jobs DROP COLUMN IF EXISTS result_state;
--   ALTER TABLE public.dm_jobs DROP COLUMN IF EXISTS delivery_mode;
--   DROP TABLE IF EXISTS public.dm_send_log;
-- (Dropping dm_send_log loses only send receipts; no automation configuration
--  is stored here.)
