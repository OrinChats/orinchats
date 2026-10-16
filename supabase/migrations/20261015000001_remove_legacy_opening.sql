-- OrinChats - remove a frase antiga que versões anteriores do editor gravavam
-- sozinhas na "Mensagem de abertura" ("Olá, aqui está o seu link! 💜").
-- O usuário nunca cadastrou esse texto: ele é esvaziado em todas as automações.
-- Idempotente: pode ser executado mais de uma vez.
UPDATE public.automations
SET dm_opening_message = ''
WHERE btrim(regexp_replace(
        lower(translate(dm_opening_message,
          'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
          'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
        '[^a-z0-9]+', ' ', 'g'), ' ') = 'ola aqui esta o seu link';
