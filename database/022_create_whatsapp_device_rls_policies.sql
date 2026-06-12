-- # Objetivo
-- Ativar RLS e criar policies multi-tenant para whatsapp_devices e
-- whatsapp_device_logs.
--
-- # Explicação
-- Admins da empresa gerenciam dispositivos da propria empresa. Funcionarios
-- podem visualizar status basico dos dispositivos da propria empresa, mas nao
-- criar, revogar ou alterar emissor principal. A extensao nao acessa Supabase
-- diretamente; ela usa APIs Next.js.
--
-- # SQL completo
alter table public.whatsapp_devices enable row level security;
alter table public.whatsapp_device_logs enable row level security;

revoke all on public.whatsapp_devices from anon, authenticated;
revoke all on public.whatsapp_device_logs from anon, authenticated;

grant select, insert, update on public.whatsapp_devices to authenticated;
grant select, insert on public.whatsapp_device_logs to authenticated;

drop policy if exists whatsapp_devices_select_own_company on public.whatsapp_devices;
create policy whatsapp_devices_select_own_company
on public.whatsapp_devices
for select
to authenticated
using (
  public.is_company_member(company_id)
  or public.is_platform_user()
);

drop policy if exists whatsapp_devices_insert_admin on public.whatsapp_devices;
create policy whatsapp_devices_insert_admin
on public.whatsapp_devices
for insert
to authenticated
with check (
  public.is_company_admin(company_id)
  or public.is_platform_admin()
);

drop policy if exists whatsapp_devices_update_admin on public.whatsapp_devices;
create policy whatsapp_devices_update_admin
on public.whatsapp_devices
for update
to authenticated
using (
  public.is_company_admin(company_id)
  or public.is_platform_admin()
)
with check (
  public.is_company_admin(company_id)
  or public.is_platform_admin()
);

drop policy if exists whatsapp_device_logs_select_admin on public.whatsapp_device_logs;
create policy whatsapp_device_logs_select_admin
on public.whatsapp_device_logs
for select
to authenticated
using (
  public.is_company_admin(company_id)
  or public.is_platform_user()
);

drop policy if exists whatsapp_device_logs_insert_admin on public.whatsapp_device_logs;
create policy whatsapp_device_logs_insert_admin
on public.whatsapp_device_logs
for insert
to authenticated
with check (
  public.is_company_admin(company_id)
  or public.is_platform_admin()
);

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 021.
--
-- # Resultado esperado
-- RLS protege dispositivos e logs por empresa. A extensao continua sem acesso
-- direto ao Supabase.

