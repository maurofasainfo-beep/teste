-- # Objetivo
-- Criar a tabela queue_entries, responsável pelos clientes em fila.
--
-- # Explicação
-- Cada entrada da fila pertence a uma empresa por company_id, possui senha/ticket,
-- posição operacional e datas de transição de status.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 003.
--
-- # SQL
do $$
begin
  create type public.queue_entry_status as enum ('waiting', 'released', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  ticket_code text not null,
  status public.queue_entry_status not null default 'waiting',
  position integer,
  created_by uuid references public.profiles(id) on delete set null,
  released_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint queue_entries_position_positive_check
    check (position is null or position > 0),
  constraint queue_entries_company_ticket_unique unique (company_id, ticket_code)
);

-- # Resultado Esperado
-- Tabela queue_entries criada com isolamento por company_id e estados de fila.
