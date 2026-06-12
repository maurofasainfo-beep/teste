-- # Objetivo
-- Criar a tabela companies, responsável por armazenar as empresas do SaaS.
--
-- # Explicação
-- Cada empresa possui um slug público para o display de fila e um status operacional.
-- O slug é único e será usado na URL /display/{slug}.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 001.
--
-- # SQL
create extension if not exists pgcrypto;

do $$
begin
  create type public.company_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null,
  corporate_name text not null,
  trade_name text not null,
  email text not null,
  phone text,
  status public.company_status not null default 'active',
  public_queue_slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_cnpj_digits_check
    check (char_length(regexp_replace(cnpj, '\D', '', 'g')) = 14),
  constraint companies_slug_format_check
    check (public_queue_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint companies_cnpj_unique unique (cnpj),
  constraint companies_public_queue_slug_unique unique (public_queue_slug)
);

-- # Resultado Esperado
-- Tabela companies criada com status, slug público único e validações básicas.
