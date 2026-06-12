-- # Objetivo
-- Criar a tabela whatsapp_device_logs para auditoria operacional dos
-- dispositivos WhatsApp Web.
--
-- # Explicação
-- Logs ajudam suporte, seguranca e observabilidade, mas nao devem armazenar
-- token puro, segredo HMAC, telefone completo desnecessario ou corpo completo
-- de mensagens.
--
-- # SQL completo
create table if not exists public.whatsapp_device_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid references public.whatsapp_devices(id) on delete set null,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint whatsapp_device_logs_event_type_check
    check (event_type in (
      'device_created',
      'device_activated',
      'device_revoked',
      'heartbeat_received',
      'message_batch_reserved',
      'message_sent_ack',
      'message_failed_ack',
      'auth_failed',
      'device_error',
      'primary_sender_changed',
      'rate_limited'
    ))
);

comment on table public.whatsapp_device_logs is
  'Logs sanitizados de eventos operacionais dos dispositivos WhatsApp Web.';

comment on column public.whatsapp_device_logs.metadata is
  'Metadados sanitizados. Nunca armazenar token, segredo HMAC ou payload sensivel bruto.';

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 018.
--
-- # Resultado esperado
-- A tabela whatsapp_device_logs fica disponivel para auditoria segura dos
-- dispositivos da futura extensao.

