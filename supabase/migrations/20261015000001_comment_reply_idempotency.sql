-- Persistent, atomic idempotency guard for public replies to Instagram comments.
-- Non-destructive: existing audit/job tables and production data are preserved.
CREATE TABLE IF NOT EXISTS public.comment_reply_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  CONSTRAINT uq_comment_reply_claim UNIQUE (instagram_account_id, comment_id)
);

ALTER TABLE public.comment_reply_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own comment reply claims"
  ON public.comment_reply_claims FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.automations a
    WHERE a.id = comment_reply_claims.automation_id AND a.user_id = auth.uid()
  ));
-- Writes are performed only by the service-role backend. No client write policy.
CREATE INDEX IF NOT EXISTS idx_comment_reply_claims_created_at
  ON public.comment_reply_claims(created_at DESC);
