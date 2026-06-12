-- # Objetivo
-- Criar a tabela message_events para auditoria de mensageria.
--
-- # Explicação
-- A integração real com WhatsApp ainda não envia mensagens. Inicialmente, o provider
-- none registra eventos gerados pelo NoopMessageProvider. O provider evolution_api
-- fica reservado para implementação futura.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 005.
--
-- # SQL
do $$
begin
  create type public.message_provider as enum ('none', 'evolution_api');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_event_status as enum ('recorded', 'sent', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  queue_entry_id uuid references public.queue_entries(id) on delete set null,
  provider public.message_provider not null default 'none',
  type public.message_template_type not null,
  payload jsonb not null default '{}'::jsonb,
  status public.message_event_status not null default 'recorded',
  error_message text,
  created_at timestamptz not null default now()
);

-- # Resultado Esperado
-- Tabela message_events criada para registrar eventos de mensagens sem expor tokens.
