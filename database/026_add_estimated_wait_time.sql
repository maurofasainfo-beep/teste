-- # Objetivo
-- Adicionar estimativa de espera por empresa e inclui-la na RPC publica do cliente.
--
-- # Seguranca
-- O calculo usa apenas o company_id da entrada encontrada pelo token publico.
-- Nenhuma entrada historica, telefone completo ou identificador interno adicional
-- e retornado ao cliente.

begin;

alter table public.company_settings
  add column if not exists estimated_wait_enabled boolean not null default true,
  add column if not exists estimated_wait_default_minutes integer not null default 15,
  add column if not exists estimated_wait_sample_size integer not null default 10,
  add column if not exists estimated_wait_margin_percent integer not null default 25;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_estimated_wait_default_range_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_estimated_wait_default_range_check
      check (estimated_wait_default_minutes between 1 and 120);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_estimated_wait_sample_range_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_estimated_wait_sample_range_check
      check (estimated_wait_sample_size between 3 and 50);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_estimated_wait_margin_range_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_estimated_wait_margin_range_check
      check (estimated_wait_margin_percent between 0 and 100);
  end if;
end;
$$;

comment on column public.company_settings.estimated_wait_enabled is
  'Define se a estimativa de espera aparece no link publico do cliente.';
comment on column public.company_settings.estimated_wait_default_minutes is
  'Tempo medio por cliente usado quando a empresa ainda nao possui historico.';
comment on column public.company_settings.estimated_wait_sample_size is
  'Quantidade maxima de atendimentos recentes usada no calculo da media.';
comment on column public.company_settings.estimated_wait_margin_percent is
  'Margem percentual aplicada abaixo e acima da estimativa base.';

-- A assinatura de retorno muda, por isso a funcao precisa ser removida e
-- recriada dentro da mesma transacao.
drop function if exists public.get_public_customer_queue_entry(text);

create function public.get_public_customer_queue_entry(customer_token text)
returns table (
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
  is_expired boolean,
  estimated_wait_min_minutes integer,
  estimated_wait_max_minutes integer,
  estimated_wait_label text,
  estimated_wait_available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with matched as (
    select
      q.company_id,
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
      coalesce(cs.estimated_wait_enabled, true) as wait_enabled,
      coalesce(cs.estimated_wait_default_minutes, 15) as wait_default_minutes,
      coalesce(cs.estimated_wait_sample_size, 10) as wait_sample_size,
      coalesce(cs.estimated_wait_margin_percent, 25) as wait_margin_percent,
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
    left join public.company_settings cs on cs.company_id = q.company_id
    where q.public_customer_token = customer_token
      and c.status = 'active'
    limit 1
  ),
  historical_waits as (
    select
      extract(epoch from (history_entry.released_at - history_entry.created_at)) / 60.0
        as wait_minutes
    from public.queue_entries history_entry
    inner join matched on matched.company_id = history_entry.company_id
    where history_entry.status in ('released', 'completed')
      and history_entry.released_at is not null
      and history_entry.created_at is not null
      and history_entry.released_at > history_entry.created_at
    order by history_entry.released_at desc
    limit (select wait_sample_size from matched)
  ),
  wait_average as (
    select avg(wait_minutes) as average_wait_minutes
    from historical_waits
  ),
  estimated as (
    select
      matched.*,
      coalesce(wait_average.average_wait_minutes, matched.wait_default_minutes::numeric)
        as average_wait_minutes
    from matched
    cross join wait_average
  ),
  visibility as (
    select
      estimated.*,
      (
        status = 'waiting'
        or (status = 'released' and is_expired = false)
      ) as can_show_details
    from estimated
  ),
  calculated as (
    select
      visibility.*,
      (
        can_show_details
        and status = 'waiting'
        and wait_enabled
        and "position" is not null
        and "position" > 0
      ) as wait_available,
      case
        when can_show_details
          and status = 'waiting'
          and wait_enabled
          and "position" is not null
          and "position" > 0
        then greatest(
          1,
          round(
            "position" * average_wait_minutes *
            ((100 - wait_margin_percent)::numeric / 100)
          )::integer
        )
        else null
      end as wait_min_minutes,
      case
        when can_show_details
          and status = 'waiting'
          and wait_enabled
          and "position" is not null
          and "position" > 0
        then greatest(
          1,
          round(
            "position" * average_wait_minutes *
            ((100 + wait_margin_percent)::numeric / 100)
          )::integer
        )
        else null
      end as wait_max_minutes
    from visibility
  )
  select
    case when can_show_details then customer_name else null end as customer_name,
    case
      when can_show_details then public.mask_customer_phone(customer_phone)
      else null
    end as masked_customer_phone,
    case when can_show_details then ticket_code else null end as ticket_code,
    status,
    case when can_show_details then "position" else null end as "position",
    case when can_show_details then party_size else null end as party_size,
    company_trade_name,
    public_queue_slug,
    case when can_show_details then created_at else null end as created_at,
    case
      when status = 'released' and is_expired = false then released_at
      else null
    end as released_at,
    cancelled_at,
    completed_at,
    expiration_minutes as released_link_expiration_minutes,
    expires_at,
    is_expired,
    wait_min_minutes as estimated_wait_min_minutes,
    wait_max_minutes as estimated_wait_max_minutes,
    case
      when wait_available then wait_min_minutes || ' - ' || wait_max_minutes || ' min'
      else null
    end as estimated_wait_label,
    wait_available as estimated_wait_available
  from calculated;
$$;

revoke all on function public.get_public_customer_queue_entry(text) from public;
grant execute on function public.get_public_customer_queue_entry(text)
  to anon, authenticated, service_role;

commit;

-- # Como executar no SQL Editor do Supabase
-- Copie este arquivo completo, cole no SQL Editor e execute depois da migration
-- 025_harden_whatsapp_device_rpc.sql.
--
-- # Resultado esperado
-- O link de um cliente waiting recebe uma faixa estimada baseada apenas no
-- historico recente da propria empresa. Sem historico, usa o tempo padrao.
-- Outros status nao recebem estimativa e continuam seguindo a ocultacao da 024.
