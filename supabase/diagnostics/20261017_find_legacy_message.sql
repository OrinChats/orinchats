-- 1) Onde a frase antiga está gravada (qualquer coluna da automação)
SELECT id, name, type, is_active, dm_opening_message, dm_opening_message_button_title
FROM public.automations a
WHERE row_to_json(a)::text ILIKE '%aqui est% o seu link%';

-- 2) Todas as automações ativas da conta (duas ativas no mesmo gatilho disparam juntas)
SELECT id, name, type, is_active, post_id, keywords, dm_opening_message_enabled,
       left(dm_opening_message, 40) AS abertura, dm_opening_message_button_title,
       jsonb_array_length(coalesce(dm_responses, '[]'::jsonb)) AS qtd_respostas, updated_at
FROM public.automations
ORDER BY is_active DESC, updated_at DESC;
