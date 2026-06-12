-- # Objetivo
-- Criar índices de performance e habilitar Realtime para a fila.
--
-- # Explicação
-- Os índices priorizam consultas por company_id, status, slug e eventos.
-- A tabela queue_entries entra na publicação supabase_realtime para o painel
-- operacional autenticado. O display público usa Broadcast do trigger.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 008.
--
-- # SQL
create index if not exists companies_public_queue_slug_idx
on public.companies (public_queue_slug);

create index if not exists profiles_company_id_idx
on public.profiles (company_id);

create index if not exists profiles_user_id_idx
on public.profiles (user_id);

create index if not exists queue_entries_company_status_position_idx
on public.queue_entries (company_id, status, position);

create index if not exists queue_entries_company_created_at_idx
on public.queue_entries (company_id, created_at desc);

create index if not exists queue_entries_company_released_at_idx
on public.queue_entries (company_id, released_at desc);

create index if not exists message_templates_company_type_idx
on public.message_templates (company_id, type);

create unique index if not exists message_templates_one_active_per_type_idx
on public.message_templates (company_id, type)
where active;

create index if not exists message_events_company_created_at_idx
on public.message_events (company_id, created_at desc);

create index if not exists message_events_queue_entry_id_idx
on public.message_events (queue_entry_id);

alter table public.queue_entries replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    execute 'create publication supabase_realtime';
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.queue_entries;
exception
  when duplicate_object then null;
end $$;

-- # Resultado Esperado
-- Índices criados e queue_entries habilitada para Supabase Realtime.
