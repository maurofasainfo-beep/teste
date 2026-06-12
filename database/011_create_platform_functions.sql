-- # Objetivo
-- Criar funções auxiliares para identificar usuários da plataforma SaaS.
--
-- # Explicação
-- As funções abaixo são usadas por RLS e pelo backend para separar claramente
-- usuários da plataforma de usuários das empresas clientes.
--
-- Elas consultam platform_profiles pelo auth.uid() ativo e não dependem de
-- company_id.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 011.
--
-- # SQL
create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_profiles p
    where p.user_id = auth.uid()
      and p.role = 'owner'
      and p.status = 'active'
  )
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_profiles p
    where p.user_id = auth.uid()
      and p.role in ('owner', 'admin')
      and p.status = 'active'
  )
$$;

create or replace function public.is_platform_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_profiles p
    where p.user_id = auth.uid()
      and p.role in ('owner', 'admin', 'support')
      and p.status = 'active'
  )
$$;

create or replace function public.is_platform_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_support()
$$;

grant execute on function public.is_platform_owner() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_platform_support() to authenticated;
grant execute on function public.is_platform_user() to authenticated;

-- # Resultado Esperado
-- Funções is_platform_owner/admin/support/user criadas para RLS e backend.
