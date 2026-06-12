-- # Objetivo
-- Criar indices para dispositivos WhatsApp e eventos QWEP.
--
-- # Explicação
-- Os indices otimizam listagem por empresa, busca por token hash, primary sender
-- unico, reserva de eventos pendentes e auditoria de logs.
--
-- # SQL completo
create unique index if not exists whatsapp_devices_one_primary_per_company_idx
on public.whatsapp_devices (company_id)
where is_primary_sender = true
  and status <> 'revoked';

create index if not exists whatsapp_devices_company_status_idx
on public.whatsapp_devices (company_id, status, updated_at desc);

create index if not exists whatsapp_devices_token_hash_idx
on public.whatsapp_devices (token_hash);

create index if not exists whatsapp_device_logs_company_created_idx
on public.whatsapp_device_logs (company_id, created_at desc);

create index if not exists whatsapp_device_logs_device_created_idx
on public.whatsapp_device_logs (device_id, created_at desc);

create index if not exists message_events_qwep_pending_idx
on public.message_events (
  company_id,
  provider,
  status,
  next_retry_at,
  created_at
)
where provider = 'whatsapp_extension'
  and status in ('pending', 'retry');

create index if not exists message_events_qwep_reservation_idx
on public.message_events (
  device_id,
  reservation_id,
  reservation_expires_at
)
where status in ('reserved', 'processing');

create unique index if not exists message_events_idempotency_key_unique_idx
on public.message_events (idempotency_key)
where idempotency_key is not null;

create index if not exists company_settings_notification_channel_idx
on public.company_settings (notification_channel);

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 022.
--
-- # Resultado esperado
-- Consultas de dispositivos, logs e reserva de eventos QWEP passam a usar
-- indices adequados para crescimento multi-tenant.

