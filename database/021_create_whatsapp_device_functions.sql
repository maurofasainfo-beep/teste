-- # Objetivo
-- Criar funcoes server-side para gerenciar primary sender, revogacao e reserva
-- atomica de eventos QWEP.
--
-- # Explicação
-- A extensao nao acessa Supabase diretamente. As APIs Next.js usam estas funcoes
-- com service role para manter reserva atomica, evitar duplicidade e preservar o
-- isolamento por company_id derivado do dispositivo.
--
-- # SQL completo
create extension if not exists pgcrypto;

create or replace function public.get_primary_whatsapp_device(target_company_id uuid)
returns setof public.whatsapp_devices
language sql
stable
security definer
set search_path = public
as $$
  select d.*
  from public.whatsapp_devices d
  where d.company_id = target_company_id
    and d.is_primary_sender = true
    and d.status <> 'revoked'
  limit 1
$$;

create or replace function public.set_primary_whatsapp_device(target_device_id uuid)
returns public.whatsapp_devices
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.whatsapp_devices;
begin
  select *
  into target_device
  from public.whatsapp_devices
  where id = target_device_id;

  if target_device.id is null then
    raise exception 'Dispositivo nao encontrado.';
  end if;

  if not (public.is_company_admin(target_device.company_id) or public.is_platform_admin()) then
    raise exception 'Acesso negado.';
  end if;

  if target_device.status = 'revoked' then
    raise exception 'Dispositivo revogado nao pode ser emissor principal.';
  end if;

  update public.whatsapp_devices
  set is_primary_sender = false
  where company_id = target_device.company_id
    and id <> target_device.id;

  update public.whatsapp_devices
  set is_primary_sender = true
  where id = target_device.id
  returning * into target_device;

  insert into public.whatsapp_device_logs (
    company_id,
    device_id,
    event_type,
    message
  ) values (
    target_device.company_id,
    target_device.id,
    'primary_sender_changed',
    'Dispositivo definido como emissor principal.'
  );

  return target_device;
end;
$$;

create or replace function public.revoke_whatsapp_device(target_device_id uuid)
returns public.whatsapp_devices
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.whatsapp_devices;
begin
  select *
  into target_device
  from public.whatsapp_devices
  where id = target_device_id;

  if target_device.id is null then
    raise exception 'Dispositivo nao encontrado.';
  end if;

  if not (public.is_company_admin(target_device.company_id) or public.is_platform_admin()) then
    raise exception 'Acesso negado.';
  end if;

  update public.whatsapp_devices
  set
    status = 'revoked',
    revoked_at = coalesce(revoked_at, now()),
    is_primary_sender = false
  where id = target_device.id
  returning * into target_device;

  update public.message_events
  set
    status = 'retry',
    device_id = null,
    reservation_id = null,
    reservation_token_hash = null,
    reserved_at = null,
    reservation_expires_at = null,
    processing_started_at = null,
    next_retry_at = now()
  where company_id = target_device.company_id
    and device_id = target_device.id
    and status in ('reserved', 'processing');

  insert into public.whatsapp_device_logs (
    company_id,
    device_id,
    event_type,
    message
  ) values (
    target_device.company_id,
    target_device.id,
    'device_revoked',
    'Dispositivo revogado.'
  );

  return target_device;
end;
$$;

create or replace function public.release_expired_message_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.message_events
  set
    status = case
      when attempt_count >= max_attempts then 'failed'::public.message_event_status
      else 'retry'::public.message_event_status
    end,
    failed_at = case
      when attempt_count >= max_attempts then now()
      else failed_at
    end,
    next_retry_at = case
      when attempt_count >= max_attempts then null
      else now()
    end,
    device_id = null,
    reservation_id = null,
    reservation_token_hash = null,
    reserved_at = null,
    reservation_expires_at = null,
    processing_started_at = null,
    error_message = coalesce(error_message, 'Reserva expirada.')
  where status in ('reserved', 'processing')
    and reservation_expires_at is not null
    and reservation_expires_at < now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

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
set search_path = public
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
    generated_reservation_token := encode(gen_random_bytes(32), 'hex');

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

revoke all on function public.reserve_pending_message_events(uuid, integer) from anon, authenticated;
revoke all on function public.release_expired_message_reservations() from anon, authenticated;
grant execute on function public.reserve_pending_message_events(uuid, integer) to service_role;
grant execute on function public.release_expired_message_reservations() to service_role;
grant execute on function public.get_primary_whatsapp_device(uuid) to authenticated, service_role;
grant execute on function public.set_primary_whatsapp_device(uuid) to authenticated, service_role;
grant execute on function public.revoke_whatsapp_device(uuid) to authenticated, service_role;

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 020.
--
-- # Resultado esperado
-- Funcoes de primary sender, revogacao e reserva atomica de eventos QWEP ficam
-- disponiveis para o backend Next.js.

