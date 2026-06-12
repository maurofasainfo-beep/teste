-- # Objetivo
-- Adicionar a quantidade de pessoas do grupo em cada entrada da fila.
--
-- # Explicacao
-- O campo party_size permite que o atendimento saiba quantas pessoas fazem parte
-- do grupo do cliente. O valor padrao e 1 para preservar registros antigos.
-- A regra inicial usa limite maximo 20, conforme requisito de padrao quando nao
-- houver configuracao especifica.
--
-- # SQL completo
alter table public.queue_entries
  add column if not exists party_size integer not null default 1;

alter table public.queue_entries
  drop constraint if exists queue_entries_party_size_range_check;

alter table public.queue_entries
  add constraint queue_entries_party_size_range_check
  check (party_size between 1 and 20);

comment on column public.queue_entries.party_size is
  'Quantidade de pessoas do grupo do cliente na fila.';

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 012.
--
-- # Resultado esperado
-- A tabela queue_entries passa a possuir party_size obrigatorio, com default 1 e
-- validacao entre 1 e 20.
