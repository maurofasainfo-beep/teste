-- # Objetivo
-- Ativar RLS e criar policies para platform_profiles.
--
-- # Explicação
-- Usuários comuns das empresas clientes não acessam platform_profiles.
-- Usuários da plataforma só acessam platform_profiles se estiverem ativos.
--
-- Importante: estas policies não dão acesso automático às tabelas das empresas
-- clientes. O acesso administrativo a companies/profiles no painel da plataforma
-- deve ocorrer explicitamente no servidor, após validar platform_profiles.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 012.
--
-- # SQL
alter table public.platform_profiles enable row level security;

revoke all on public.platform_profiles from anon, authenticated;
grant select, insert, update on public.platform_profiles to authenticated;

drop policy if exists platform_profiles_select_platform_users on public.platform_profiles;
create policy platform_profiles_select_platform_users
on public.platform_profiles
for select
to authenticated
using (public.is_platform_user());

drop policy if exists platform_profiles_insert_owner_admin on public.platform_profiles;
create policy platform_profiles_insert_owner_admin
on public.platform_profiles
for insert
to authenticated
with check (
  public.is_platform_owner()
  or (
    public.is_platform_admin()
    and role in ('admin', 'support')
  )
);

drop policy if exists platform_profiles_update_owner_admin on public.platform_profiles;
create policy platform_profiles_update_owner_admin
on public.platform_profiles
for update
to authenticated
using (
  public.is_platform_owner()
  or (
    public.is_platform_admin()
    and role <> 'owner'
  )
)
with check (
  public.is_platform_owner()
  or (
    public.is_platform_admin()
    and role <> 'owner'
  )
);

-- # Resultado Esperado
-- RLS ativo em platform_profiles, isolando usuários da plataforma dos clientes.
