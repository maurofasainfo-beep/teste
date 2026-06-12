-- # Objetivo
-- Atualizar message_events e company_settings para suportar o protocolo QWEP v1.
--
-- # Explicação
-- A tabela message_events passa a suportar reserva, ACK, retry, idempotencia,
-- provider whatsapp_extension e estados de mensageria reais, sem quebrar os
-- eventos simulated/skipped ja existentes.
--
-- # SQL completo
alter type public.message_provider add value if not exists 'whatsapp_extension';
alter type public.message_provider add value if not exists 'sms';

alter type public.message_event_status add value if not exists 'pending';
alter type public.message_event_status add value if not exists 'reserved';
alter type public.message_event_status add value if not exists 'processing';
alter type public.message_event_status add value if not exists 'retry';
alter type public.message_event_status add value if not exists 'cancelled';
alter type public.message_event_status add value if not exists 'expired';

alter table public.message_events
  add column if not exists channel text not null default 'whatsapp',
  add column if not exists device_id uuid references public.whatsapp_devices(id) on delete set null,
  add column if not exists reservation_id uuid,
  add column if not exists reservation_token_hash text,
  add column if not exists reserved_at timestamptz,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists next_retry_at timestamptz,
  add column if not exists idempotency_key text,
  add column if not exists provider_response jsonb;

do $$
begin
  alter table public.message_events
    add constraint message_events_attempt_count_check
      check (attempt_count >= 0) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.message_events
    add constraint message_events_max_attempts_check
      check (max_attempts between 1 and 10) not valid;
exception
  when duplicate_object then null;
end $$;

alter table public.company_settings
  add column if not exists notification_channel text not null default 'simulated';

do $$
begin
  alter table public.company_settings
    add constraint company_settings_notification_channel_check
      check (notification_channel in (
        'none',
        'simulated',
        'whatsapp_extension',
        'evolution_api',
        'sms'
      )) not valid;
exception
  when duplicate_object then null;
end $$;

comment on column public.message_events.channel is
  'Canal logico da mensagem, por exemplo whatsapp, sms ou email.';

comment on column public.message_events.reservation_token_hash is
  'Hash do token de reserva retornado uma unica vez para a extensao.';

comment on column public.message_events.idempotency_key is
  'Chave de idempotencia para impedir duplicidade de envio.';

comment on column public.company_settings.notification_channel is
  'Provider/canal preferencial de notificacao da empresa.';

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 019.
--
-- # Resultado esperado
-- message_events passa a suportar QWEP v1 e company_settings passa a armazenar
-- o canal de notificacao escolhido pela empresa.
