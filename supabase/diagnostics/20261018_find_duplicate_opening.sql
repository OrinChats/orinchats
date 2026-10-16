-- Confirma a causa do "abertura repetida depois do clique":
-- jobs de abertura que falharam/foram reagendados e ficaram parados até o próximo webhook.
SELECT id, job_type, status, attempts, run_after, last_error, created_at, updated_at
FROM public.job_queue
WHERE job_type = 'auto_dm'
ORDER BY created_at DESC
LIMIT 30;

-- Quantas aberturas cada pessoa recebeu por comentário (deveria ser 1 por automação).
SELECT automation_id, trigger_user_id, COUNT(*) AS jobs, MIN(created_at) AS primeiro, MAX(created_at) AS ultimo
FROM public.dm_jobs
GROUP BY automation_id, trigger_user_id
HAVING COUNT(*) > 1
ORDER BY ultimo DESC;
