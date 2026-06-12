-- # Objetivo
-- Criar a tabela profiles, vinculando usuários do Supabase Auth a uma empresa.
--
-- # Explicação
-- A tabela profiles contém o tenant do usuário por company_id e seu papel de acesso.
-- O user_id referencia auth.users(id), mantendo Supabase Auth como origem da identidade.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 002.
--
-- # SQL
do $$
begin
  create type public.profile_role as enum ('admin', 'employee');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.profile_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text not null,
  role public.profile_role not null default 'employee',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_id_unique unique (user_id),
  constraint profiles_company_email_unique unique (company_id, email)
);

-- # Resultado Esperado
-- Tabela profiles criada com vínculo para auth.users e companies.
