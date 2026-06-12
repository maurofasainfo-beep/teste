-- # Objetivo
-- Criar configuracao por empresa para validade do link apos liberacao.
--
-- # Explicacao
-- company_settings armazena configuracoes operacionais que nao pertencem ao
-- cadastro principal da empresa. O campo released_link_expiration_minutes define
-- por quantos minutos o link individual continua valido depois que o cliente e
-- chamado. O padrao e 5 minutos.
--
-- # SQL completo
create table if not exists public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  released_link_expiration_minutes integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_settings_released_expiration_range_check
    check (released_link_expiration_minutes between 1 and 60)
);

insert into public.company_settings (company_id)
select c.id
from public.companies c
on conflict (company_id) do nothing;

create or replace function public.ensure_company_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  return new;
end;
$$;

drop trigger if exists companies_ensure_settings on public.companies;
create trigger companies_ensure_settings
after insert on public.companies
for each row execute function public.ensure_company_settings();

drop trigger if exists company_settings_set_updated_at on public.company_settings;
create trigger company_settings_set_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

comment on table public.company_settings is
  'Configuracoes operacionais por empresa.';

comment on column public.company_settings.released_link_expiration_minutes is
  'Tempo, em minutos, de validade do link individual apos o cliente ser chamado.';

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 014.
--
-- # Resultado esperado
-- A tabela company_settings e criada, empresas existentes recebem configuracao
-- padrao e novas empresas passam a receber configuracao automaticamente.
