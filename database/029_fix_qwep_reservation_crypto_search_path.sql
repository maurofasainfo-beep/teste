-- # Objetivo
-- Corrigir a reserva de mensagens QWEP quando o Supabase nao encontra
-- gen_random_bytes(integer) dentro da funcao reserve_pending_message_events.
--
-- # Problema
-- Em alguns projetos Supabase, pgcrypto fica no schema extensions. Como a RPC
-- usava search_path = public e chamava gen_random_bytes sem schema, o Bot
-- recebia:
--
-- Falha ao reservar mensagens.: function gen_random_bytes(integer) does not exist
--
-- # Solucao
-- 1. Garantir pgcrypto disponivel.
-- 2. Recriar reserve_pending_message_events com search_path public, extensions.
-- 3. Gerar reservation_token com gen_random_uuid(), evitando gen_random_bytes.
-- 4. Recriar set_queue_entry_defaults usando gen_random_uuid() e mantendo a
--    tentativa contra colisao de ticket_code.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.reserve_pending_message_events(
  target_device_id uuid,
  batch_limit integer default 5
)
returns table (
  id uuid,
  queue_entry_id uuid,
  type public.message_template_type,
  payload jsonb,
  idempotency_key text,
  reservation_id uuid,
  reservation_token text,
  attempt_count integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_device public.whatsapp_devices;
  candidate record;
  generated_reservation_id uuid;
  generated_reservation_token text;
  safe_limit integer;
begin
  perform public.release_expired_message_reservations();

  safe_limit := least(greatest(coalesce(batch_limit, 5), 1), 20);

  select *
  into target_device
  from public.whatsapp_devices
  where whatsapp_devices.id = target_device_id
  limit 1;

  if target_device.id is null then
    return;
  end if;

  if target_device.status <> 'active' or target_device.is_primary_sender is not true then
    return;
  end if;

  for candidate in
    select me.*
    from public.message_events me
    where me.company_id = target_device.company_id
      and me.provider = 'whatsapp_extension'
      and (
        me.status = 'pending'
        or (
          me.status = 'retry'
          and (me.next_retry_at is null or me.next_retry_at <= now())
        )
      )
      and me.attempt_count < me.max_attempts
      and (
        me.reservation_expires_at is null
        or me.reservation_expires_at < now()
      )
    order by me.created_at asc, me.id asc
    limit safe_limit
    for update skip locked
  loop
    generated_reservation_id := gen_random_uuid();
    generated_reservation_token :=
      replace(gen_random_uuid()::text, '-', '') ||
      replace(gen_random_uuid()::text, '-', '');

    update public.message_events me
    set
      status = 'reserved',
      device_id = target_device.id,
      reservation_id = generated_reservation_id,
      reservation_token_hash = encode(
        digest('qwep-reservation-token:' || generated_reservation_token, 'sha256'),
        'hex'
      ),
      reserved_at = now(),
      reservation_expires_at = now() + interval '120 seconds',
      processing_started_at = null,
      attempt_count = me.attempt_count + 1,
      error_message = null
    where me.id = candidate.id
    returning
      me.id,
      me.queue_entry_id,
      me.type,
      me.payload,
      me.idempotency_key,
      me.reservation_id,
      generated_reservation_token,
      me.attempt_count,
      me.max_attempts
    into
      id,
      queue_entry_id,
      type,
      payload,
      idempotency_key,
      reservation_id,
      reservation_token,
      attempt_count,
      max_attempts;

    return next;
  end loop;
end;
$$;

create or replace function public.set_queue_entry_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_position integer;
  generated_ticket text;
  attempt integer;
  ticket_is_unique boolean;
begin
  perform pg_advisory_xact_lock(hashtext(new.company_id::text));

  if new.ticket_code is null or btrim(new.ticket_code) = '' then
    for attempt in 1..20 loop
      generated_ticket = 'Q' || to_char(now(), 'YYYYMMDD') || '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

      ticket_is_unique = not exists (
        select 1
        from public.queue_entries existing
        where existing.company_id = new.company_id
          and existing.ticket_code = generated_ticket
          and existing.id is distinct from new.id
      );

      exit when ticket_is_unique;
    end loop;

    if generated_ticket is null or ticket_is_unique is not true then
      raise exception 'Nao foi possivel gerar um codigo de fila unico.';
    end if;

    new.ticket_code = generated_ticket;
  end if;

  if new.status is null then
    new.status = 'waiting';
  end if;

  if new.status = 'waiting' then
    if new.position is null then
      select coalesce(max(position), 0) + 1
      into next_position
      from public.queue_entries
      where company_id = new.company_id
        and status = 'waiting';

      new.position = next_position;
    end if;
  else
    new.position = null;
  end if;

  return new;
end;
$$;

revoke all on function public.reserve_pending_message_events(uuid, integer)
from anon, authenticated;
grant execute on function public.reserve_pending_message_events(uuid, integer)
to service_role;

commit;

-- # Como executar no SQL Editor do Supabase
-- Copie este arquivo completo, cole no SQL Editor e execute depois da migration
-- 028_harden_queue_ticket_generation.sql.
--
-- # Resultado esperado
-- O Bot volta a reservar mensagens pendentes sem erro de gen_random_bytes, e os
-- eventos "aguardando envio" passam para reserved/processing/sent conforme o
-- WhatsApp estiver conectado.
