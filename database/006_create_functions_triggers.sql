-- # Objetivo
-- Criar funções, RPCs públicas seguras e triggers operacionais.
--
-- # Explicação
-- Este arquivo cria helpers de tenant para RLS, atualiza updated_at automaticamente,
-- gera ticket/posição da fila, renumera a fila e emite Broadcast público limitado
-- para o display sem expor a tabela queue_entries para usuários anon.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 006.
--
-- # SQL
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = target_company_id
      and p.status = 'active'
  )
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = target_company_id
      and p.role = 'admin'
      and p.status = 'active'
  )
$$;

create or replace function public.set_queue_entry_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_position integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.company_id::text));

  if new.ticket_code is null or btrim(new.ticket_code) = '' then
    new.ticket_code = 'Q' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
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

create or replace function public.renumber_waiting_queue(target_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.queue_entries q
  set position = ranked.position
  from (
    select id, row_number() over (order by created_at, id)::integer as position
    from public.queue_entries
    where company_id = target_company_id
      and status = 'waiting'
  ) ranked
  where q.id = ranked.id
    and q.position is distinct from ranked.position;
end;
$$;

create or replace function public.after_queue_entry_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company_id uuid;
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  target_company_id = coalesce(new.company_id, old.company_id);
  perform public.renumber_waiting_queue(target_company_id);
  return coalesce(new, old);
end;
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
    'released_at', coalesce(new.released_at, old.released_at),
    'created_at', coalesce(new.created_at, old.created_at)
  );

  perform realtime.send(
    jsonb_build_object('operation', tg_op, 'record', queue_record),
    'queue_changed',
    'public-display:' || company_slug,
    false
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.get_public_company(queue_slug text)
returns table (
  id uuid,
  trade_name text,
  public_queue_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.trade_name, c.public_queue_slug
  from public.companies c
  where c.public_queue_slug = queue_slug
    and c.status = 'active'
  limit 1
$$;

create or replace function public.get_public_queue_entries(queue_slug text)
returns table (
  id uuid,
  company_id uuid,
  customer_name text,
  ticket_code text,
  status public.queue_entry_status,
  "position" integer,
  created_at timestamptz,
  released_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.company_id, q.customer_name, q.ticket_code, q.status,
         q.position as "position", q.created_at, q.released_at
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

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists message_templates_set_updated_at on public.message_templates;
create trigger message_templates_set_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

drop trigger if exists queue_entries_set_defaults on public.queue_entries;
create trigger queue_entries_set_defaults
before insert or update on public.queue_entries
for each row execute function public.set_queue_entry_defaults();

drop trigger if exists queue_entries_after_change on public.queue_entries;
create trigger queue_entries_after_change
after insert or update or delete on public.queue_entries
for each row execute function public.after_queue_entry_change();

drop trigger if exists queue_entries_public_broadcast on public.queue_entries;
create trigger queue_entries_public_broadcast
after insert or update or delete on public.queue_entries
for each row execute function public.emit_public_queue_broadcast();

grant execute on function public.get_public_company(text) to anon, authenticated;
grant execute on function public.get_public_queue_entries(text) to anon, authenticated;

-- # Resultado Esperado
-- Funções, triggers e RPCs públicas limitadas criadas com sucesso.
