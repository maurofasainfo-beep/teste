-- # Objetivo
-- Criar token publico unico para o link individual do cliente.
--
-- # Explicacao
-- O token funciona como identificador publico de alta entropia para a URL
-- /queue/customer/{token}. O link completo nao e armazenado porque depende do
-- dominio do ambiente; a aplicacao monta a URL a partir do token.
--
-- # SQL completo
create extension if not exists pgcrypto;

create or replace function public.generate_public_customer_token()
returns text
language sql
volatile
as $$
  select replace(gen_random_uuid()::text, '-', '') ||
         replace(gen_random_uuid()::text, '-', '')
$$;

alter table public.queue_entries
  add column if not exists public_customer_token text;

alter table public.queue_entries
  add column if not exists cancelled_by_customer boolean not null default false;

update public.queue_entries
set public_customer_token = public.generate_public_customer_token()
where public_customer_token is null;

alter table public.queue_entries
  alter column public_customer_token set default public.generate_public_customer_token();

alter table public.queue_entries
  alter column public_customer_token set not null;

alter table public.queue_entries
  drop constraint if exists queue_entries_public_customer_token_format_check;

alter table public.queue_entries
  add constraint queue_entries_public_customer_token_format_check
  check (public_customer_token ~ '^[a-f0-9]{64}$');

create unique index if not exists queue_entries_public_customer_token_idx
on public.queue_entries (public_customer_token);

comment on column public.queue_entries.public_customer_token is
  'Token publico unico usado para abrir o link individual do cliente.';

comment on column public.queue_entries.cancelled_by_customer is
  'Indica cancelamento solicitado pelo proprio cliente via link publico.';

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 013.
--
-- # Resultado esperado
-- Cada entrada da fila passa a ter um token publico unico e um marcador de
-- cancelamento pelo cliente.
