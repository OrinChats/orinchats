-- ═══════════════════════════════════════════════════════════════════════════
-- OrinChats - diagnostic queries for the "Olá, aqui está o seu link! 💜" audit.
--
-- These queries are READ-ONLY. They exist because the old auto-filled sentence
-- could already be stored in production data in two different places, and only
-- the account owner can decide whether each occurrence was typed on purpose.
--
-- Run them in the Supabase SQL editor (service role) and review the output
-- before changing anything. The application NEVER writes this sentence on its
-- own: the current worker treats it as "not configured" unless the automation
-- was explicitly opted in (`dm_allow_legacy_opening = true`).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1: automations whose OPENING MESSAGE holds the old sentence ────────────
-- Comparison normalizes accents, case, emoji, punctuation and spacing, so it
-- also catches the variations that were saved by different builds.
SELECT
  a.id,
  a.name,
  a.type,
  a.is_active,
  a.dm_delivery_mode,
  a.dm_allow_legacy_opening,
  a.dm_opening_message,
  a.dm_opening_message_button_title,
  a.dm_opening_message_button_link,
  a.updated_at
FROM public.automations a
WHERE regexp_replace(
        lower(translate(a.dm_opening_message, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
        '[^a-z0-9]+', ' ', 'g'
      ) = 'ola aqui esta o seu link'
ORDER BY a.updated_at DESC;

-- ── 2: automations where it is saved as a normal RESPONSE ──────────────────
SELECT
  a.id,
  a.name,
  a.is_active,
  a.dm_delivery_mode,
  a.dm_allow_legacy_opening,
  r.ordinality AS response_index,
  r.value ->> 'type'    AS response_type,
  r.value ->> 'content' AS response_content,
  r.value ->> 'enabled' AS response_enabled
FROM public.automations a
CROSS JOIN LATERAL jsonb_array_elements(a.dm_responses) WITH ORDINALITY AS r(value, ordinality)
WHERE regexp_replace(
        lower(translate(COALESCE(r.value ->> 'content', ''), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
        '[^a-z0-9]+', ' ', 'g'
      ) = 'ola aqui esta o seu link'
ORDER BY a.updated_at DESC;

-- ── 3: count per account, to see the blast radius before touching anything ──
SELECT
  a.instagram_account_id,
  count(*) FILTER (WHERE regexp_replace(
        lower(translate(a.dm_opening_message, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
        '[^a-z0-9]+', ' ', 'g'
      ) = 'ola aqui esta o seu link') AS with_sentence_as_opening,
  count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(a.dm_responses) r
        WHERE regexp_replace(
                lower(translate(COALESCE(r ->> 'content', ''), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
                '[^a-z0-9]+', ' ', 'g'
              ) = 'ola aqui esta o seu link'
      )) AS with_sentence_as_response
FROM public.automations a
GROUP BY a.instagram_account_id;

-- ── 4: OPT-IN, not run automatically ──────────────────────────────────────
-- The application already refuses to send the old sentence automatically, so
-- NO data change is required for the fix to take effect. Only run one of the
-- statements below if you want the stored value cleaned up as well. Both are
-- scoped to rows whose value is EXACTLY the old sentence (after normalization),
-- never to "everything that looks similar", and both are reversible by hand
-- because the previous value is not kept anywhere else - so take a backup first:
--
--   CREATE TABLE public.automations_backup_20261016 AS SELECT * FROM public.automations;
--
-- (a) Keep the row but record that the sentence was intentional, so the user
--     can see it in the editor and it keeps being sent:
--
--   UPDATE public.automations
--   SET dm_allow_legacy_opening = true
--   WHERE regexp_replace(lower(translate(...)), '[^a-z0-9]+', ' ', 'g') = 'ola aqui esta o seu link';
--
-- (b) Treat the stored sentence as "not configured" by clearing exactly that
--     field (the automation keeps every other configured message):
--
--   UPDATE public.automations
--   SET dm_opening_message = '', dm_allow_legacy_opening = false
--   WHERE regexp_replace(
--           lower(translate(dm_opening_message, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
--           '[^a-z0-9]+', ' ', 'g'
--         ) = 'ola aqui esta o seu link';
