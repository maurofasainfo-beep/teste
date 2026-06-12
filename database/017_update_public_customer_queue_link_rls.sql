-- # Objetivo
-- Criar RPCs publicas seguras para o link individual do cliente e proteger
-- company_settings com RLS.
--
-- # Explicacao
-- A pagina /queue/customer/{token} nao recebe acesso direto a queue_entries.
-- Ela usa funcoes security definer que retornam somente um registro por token e
-- nunca retornam telefone completo. O cancelamento publico tambem acontece por
-- RPC limitada a status waiting.
--
-- # SQL completo
create or replace function public.mask_customer_phone(raw_phone text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
  local_digits text;
begin
  digits := regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g');

  if length(digits) > 11 and left(digits, 2) = '55' then
    local_digits := substr(digits, 3);
  else
    local_digits := digits;
  end if;

  if length(local_digits) >= 10 then
    return '(' || substr(local_digits, 1, 2) || ') *****-' || right(local_digits, 4);
  end if;

  if length(local_digits) >= 4 then
    return '*****-' || right(local_digits, 4);
  end if;

  return '*****';
end;
$$;

drop function if exists public.get_public_queue_entries(text);

create or replace function public.get_public_queue_entries(queue_slug text)
returns table (
  id uuid,
  company_id uuid,
  customer_name text,
  ticket_code text,
  status public.queue_entry_status,
  "position" integer,
  party_size integer,
  created_at timestamptz,
  released_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.company_id, q.customer_name, q.ticket_code, q.status,
         q.position as "position", q.party_size, q.created_at, q.released_at
  from public.queue_entries q
  inner join public.companies c on c.id = q.company_id
  where c.public_queue_slug = queue_slug
    and c.status = 'active'
    and q.status in ('waiting', 'released')
  order by
    case q.status when 'released' then 0 else 1 end,
    q.released_at desc nulls last,
    q.position asc nulls last,
    q.created_at asc;
$$;

create or replace function public.get_public_customer_queue_entry(customer_token text)
returns table (
  id uuid,
  customer_name text,
  masked_customer_phone text,
  ticket_code text,
  status public.queue_entry_status,
  "position" integer,
  party_size integer,
  company_trade_name text,
  public_queue_slug text,
  created_at timestamptz,
  released_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  released_link_expiration_minutes integer,
  expires_at timestamptz,
  is_expired boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with matched as (
    select
      q.id,
      q.customer_name,
      q.customer_phone,
      q.ticket_code,
      q.status,
      q.position,
      q.party_size,
      c.trade_name as company_trade_name,
      c.public_queue_slug,
      q.created_at,
      q.released_at,
      q.cancelled_at,
      q.completed_at,
      coalesce(cs.released_link_expiration_minutes, 5) as expiration_minutes,
      case
        when q.status = 'released' and q.released_at is not null then
          q.released_at + make_interval(mins => coalesce(cs.released_link_expiration_minutes, 5))
        else null
      end as expires_at,
      case
        when q.status = 'released' and q.released_at is not null then
          now() >= q.released_at + make_interval(mins => coalesce(cs.released_link_expiration_minutes, 5))
        else false
      end as is_expired
    from public.queue_entries q
    inner join public.companies c on c.id = q.company_id
    left join public.company_settings cs on cs.company_id = c.id
    where q.public_customer_token = customer_token
      and c.status = 'active'
    limit 1
  )
  select
    id,
    case when is_expired then null else customer_name end as customer_name,
    case when is_expired then null else public.mask_customer_phone(customer_phone) end as masked_customer_phone,
    ticket_code,
    status,
    "position",
    case when is_expired then null else party_size end as party_size,
    company_trade_name,
    public_queue_slug,
    created_at,
    released_at,
    cancelled_at,
    completed_at,
    expiration_minutes,
    expires_at,
    is_expired
  from matched;
$$;

create or replace function public.cancel_public_customer_queue_entry(customer_token text)
returns table (
  id uuid,
  status public.queue_entry_status,
  cancelled_at timestamptz,
  cancelled_by_customer boolean
)
language sql
volatile
security definer
set search_path = public
as $$
  update public.queue_entries q
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by_customer = true
  where q.public_customer_token = customer_token
    and q.status = 'waiting'
  returning q.id, q.status, q.cancelled_at, q.cancelled_by_customer;
$$;

create or replace function public.emit_public_queue_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  company_slug text;
  queue_record jsonb;
  customer_record jsonb;
  customer_token text;
begin
  select c.public_queue_slug
  into company_slug
  from public.companies c
  where c.id = coalesce(new.company_id, old.company_id)
    and c.status = 'active';

  if company_slug is null then
    return coalesce(new, old);
  end if;

  queue_record = jsonb_build_object(
    'id', coalesce(new.id, old.id),
    'customer_name', coalesce(new.customer_name, old.customer_name),
    'ticket_code', coalesce(new.ticket_code, old.ticket_code),
    'status', coalesce(new.status, old.status),
    'position', coalesce(new.position, old.position),
    'party_size', coalesce(new.party_size, old.party_size),
    'released_at', coalesce(new.released_at, old.released_at),
    'created_at', coalesce(new.created_at, old.created_at)
  );

  perform realtime.send(
    jsonb_build_object('operation', tg_op, 'record', queue_record),
    'queue_changed',
    'public-display:' || company_slug,
    false
  );

  customer_token = coalesce(new.public_customer_token, old.public_customer_token);

  if customer_token is not null then
    customer_record = jsonb_build_object(
      'id', coalesce(new.id, old.id),
      'ticket_code', coalesce(new.ticket_code, old.ticket_code),
      'status', coalesce(new.status, old.status),
      'position', coalesce(new.position, old.position),
      'party_size', coalesce(new.party_size, old.party_size),
      'released_at', coalesce(new.released_at, old.released_at),
      'cancelled_at', coalesce(new.cancelled_at, old.cancelled_at),
      'completed_at', coalesce(new.completed_at, old.completed_at)
    );

    perform realtime.send(
      jsonb_build_object('operation', tg_op, 'record', customer_record),
      'queue_changed',
      'public-customer-queue:' || customer_token,
      false
    );
  end if;

  return coalesce(new, old);
end;
$$;

alter table public.company_settings enable row level security;

revoke all on public.company_settings from anon, authenticated;
grant select, insert, update on public.company_settings to authenticated;

drop policy if exists company_settings_select_own_company on public.company_settings;
create policy company_settings_select_own_company
on public.company_settings
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists company_settings_insert_admin on public.company_settings;
create policy company_settings_insert_admin
on public.company_settings
for insert
to authenticated
with check (public.is_company_admin(company_id));

drop policy if exists company_settings_update_admin on public.company_settings;
create policy company_settings_update_admin
on public.company_settings
for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

grant execute on function public.get_public_queue_entries(text) to anon, authenticated;
grant execute on function public.get_public_customer_queue_entry(text) to anon, authenticated;
grant execute on function public.cancel_public_customer_queue_entry(text) to anon, authenticated;
grant execute on function public.mask_customer_phone(text) to anon, authenticated;

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 016.
--
-- # Resultado esperado
-- O display publico continua funcionando, o link individual passa a buscar apenas
-- um cliente por token, o cancelamento publico fica restrito a status waiting e
-- company_settings fica protegida por RLS.
