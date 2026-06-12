-- # Objetivo
-- Ativar Row Level Security e criar policies multi-tenant completas.
--
-- # Explicação
-- A separação entre empresas acontece no banco. Usuários autenticados só acessam
-- linhas da própria empresa. O público anon não recebe acesso direto às tabelas;
-- o display público usa RPCs limitadas e Broadcast público.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 007.
--
-- # SQL
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.queue_entries enable row level security;
alter table public.message_templates enable row level security;
alter table public.message_events enable row level security;

revoke all on public.companies from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.queue_entries from anon, authenticated;
revoke all on public.message_templates from anon, authenticated;
revoke all on public.message_events from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, update on public.companies to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.queue_entries to authenticated;
grant select, insert, update on public.message_templates to authenticated;
grant select, insert on public.message_events to authenticated;

drop policy if exists companies_select_own_company on public.companies;
create policy companies_select_own_company
on public.companies
for select
to authenticated
using (public.is_company_member(id));

drop policy if exists companies_update_admin on public.companies;
create policy companies_update_admin
on public.companies
for update
to authenticated
using (public.is_company_admin(id))
with check (public.is_company_admin(id));

drop policy if exists profiles_select_own_company on public.profiles;
create policy profiles_select_own_company
on public.profiles
for select
to authenticated
using (public.is_company_member(company_id) or user_id = auth.uid());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check (public.is_company_admin(company_id));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

drop policy if exists queue_entries_select_own_company on public.queue_entries;
create policy queue_entries_select_own_company
on public.queue_entries
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists queue_entries_insert_own_company on public.queue_entries;
create policy queue_entries_insert_own_company
on public.queue_entries
for insert
to authenticated
with check (public.is_company_member(company_id));

drop policy if exists queue_entries_update_own_company on public.queue_entries;
create policy queue_entries_update_own_company
on public.queue_entries
for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists message_templates_select_own_company on public.message_templates;
create policy message_templates_select_own_company
on public.message_templates
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists message_templates_insert_admin on public.message_templates;
create policy message_templates_insert_admin
on public.message_templates
for insert
to authenticated
with check (public.is_company_admin(company_id));

drop policy if exists message_templates_update_admin on public.message_templates;
create policy message_templates_update_admin
on public.message_templates
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

drop policy if exists message_events_select_own_company on public.message_events;
create policy message_events_select_own_company
on public.message_events
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists message_events_insert_own_company on public.message_events;
create policy message_events_insert_own_company
on public.message_events
for insert
to authenticated
with check (public.is_company_member(company_id));

-- # Resultado Esperado
-- RLS ativo e policies garantindo isolamento por company_id.
