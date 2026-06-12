-- # Objetivo
-- Criar a tabela whatsapp_devices para registrar dispositivos autorizados da
-- futura extensao WhatsApp Web por empresa.
--
-- # Explicação
-- Cada dispositivo pertence exatamente a uma empresa e possui token salvo apenas
-- como hash. O segredo HMAC tambem possui hash e uma versao criptografada para
-- permitir validacao server-side sem armazenar segredo puro.
--
-- # SQL completo
create extension if not exists pgcrypto;

create table if not exists public.whatsapp_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  signing_secret_hash text,
  signing_secret_encrypted text,
  status text not null default 'pending_activation',
  is_primary_sender boolean not null default false,
  connected_phone text,
  browser_name text,
  user_agent text,
  extension_version text,
  last_seen_at timestamptz,
  last_connected_at timestamptz,
  last_disconnected_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint whatsapp_devices_status_check
    check (status in (
      'created',
      'pending_activation',
      'active',
      'disconnected',
      'error',
      'revoked',
      'expired'
    )),
  constraint whatsapp_devices_name_not_blank_check
    check (length(btrim(name)) >= 2)
);

drop trigger if exists whatsapp_devices_set_updated_at on public.whatsapp_devices;
create trigger whatsapp_devices_set_updated_at
before update on public.whatsapp_devices
for each row execute function public.set_updated_at();

comment on table public.whatsapp_devices is
  'Dispositivos autorizados para futura extensao WhatsApp Web por empresa.';

comment on column public.whatsapp_devices.token_hash is
  'Hash deterministico do token do dispositivo. O token puro nunca deve ser salvo.';

comment on column public.whatsapp_devices.signing_secret_encrypted is
  'Segredo HMAC criptografado para validacao server-side. Nao expor ao frontend.';

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 017.
--
-- # Resultado esperado
-- A tabela whatsapp_devices fica disponivel para registrar dispositivos por
-- empresa, com status, heartbeat, token hash e segredo HMAC protegido.

