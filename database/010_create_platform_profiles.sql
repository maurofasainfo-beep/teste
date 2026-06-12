-- # Objetivo
-- Criar a tabela platform_profiles para usuários da empresa proprietária do SaaS.
--
-- # Explicação
-- Esta tabela representa usuários da plataforma, não usuários das empresas
-- clientes. Por isso, não possui company_id. Usuários em platform_profiles
-- acessam o painel /platform e são separados dos usuários em profiles.
--
-- Roles permitidas: owner, admin, support.
-- Status permitidos: active, inactive.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 010.
--
-- # SQL
create table if not exists public.platform_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_profiles_user_id_unique unique (user_id),
  constraint platform_profiles_email_unique unique (email),
  constraint platform_profiles_role_check
    check (role in ('owner', 'admin', 'support')),
  constraint platform_profiles_status_check
    check (status in ('active', 'inactive'))
);

drop trigger if exists platform_profiles_set_updated_at on public.platform_profiles;
create trigger platform_profiles_set_updated_at
before update on public.platform_profiles
for each row execute function public.set_updated_at();

-- # Resultado Esperado
-- Tabela platform_profiles criada sem company_id e com validações de role/status.
