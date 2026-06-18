-- # Objetivo
-- Adicionar identidade visual por empresa para a pagina publica do cliente.
--
-- # Seguranca
-- As configuracoes pertencem a company_settings e continuam protegidas pela RLS
-- existente. O bucket e publico apenas para leitura dos assets. Escrita e remocao
-- exigem admin autenticado e caminho iniciado pela company_id da sessao.

begin;

alter table public.company_settings
  add column if not exists public_page_primary_color text not null default '#4169E1',
  add column if not exists public_page_secondary_color text not null default '#1BAF9C',
  add column if not exists public_page_position_card_background_url text,
  add column if not exists public_page_position_card_overlay_color text not null default '#0F172A',
  add column if not exists public_page_position_card_text_color text not null default '#FFFFFF';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_public_page_primary_color_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_public_page_primary_color_check
      check (public_page_primary_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_public_page_secondary_color_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_public_page_secondary_color_check
      check (public_page_secondary_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_public_page_overlay_color_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_public_page_overlay_color_check
      check (public_page_position_card_overlay_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_public_page_text_color_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_public_page_text_color_check
      check (public_page_position_card_text_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_settings_public_page_background_url_check'
      and conrelid = 'public.company_settings'::regclass
  ) then
    alter table public.company_settings
      add constraint company_settings_public_page_background_url_check
      check (
        public_page_position_card_background_url is null
        or (
          length(public_page_position_card_background_url) <= 2048
          and public_page_position_card_background_url ~
            '^https://[^[:space:]]+/storage/v1/object/public/company-public-assets/'
        )
      );
  end if;
end;
$$;

comment on column public.company_settings.public_page_primary_color is
  'Cor principal HEX aplicada somente a pagina publica individual do cliente.';
comment on column public.company_settings.public_page_secondary_color is
  'Cor secundaria HEX usada no gradiente da pagina publica do cliente.';
comment on column public.company_settings.public_page_position_card_background_url is
  'URL publica da imagem de fundo do card de posicao.';
comment on column public.company_settings.public_page_position_card_overlay_color is
  'Cor HEX do overlay aplicado com 35 por cento de opacidade.';
comment on column public.company_settings.public_page_position_card_text_color is
  'Cor HEX do texto sobre o card principal de posicao.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'company-public-assets',
  'company-public-assets',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists company_public_assets_select_own on storage.objects;
create policy company_public_assets_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-public-assets'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.is_company_admin(public.current_company_id())
);

drop policy if exists company_public_assets_insert_own on storage.objects;
create policy company_public_assets_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-public-assets'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.is_company_admin(public.current_company_id())
);

drop policy if exists company_public_assets_update_own on storage.objects;
create policy company_public_assets_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-public-assets'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.is_company_admin(public.current_company_id())
)
with check (
  bucket_id = 'company-public-assets'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.is_company_admin(public.current_company_id())
);

drop policy if exists company_public_assets_delete_own on storage.objects;
create policy company_public_assets_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-public-assets'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.is_company_admin(public.current_company_id())
);

-- A assinatura de retorno muda, por isso a funcao e recriada na mesma transacao.
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
  estimated_wait_available boolean,
  public_page_primary_color text,
  public_page_secondary_color text,
  public_page_position_card_background_url text,
  public_page_position_card_overlay_color text,
  public_page_position_card_text_color text
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
      coalesce(cs.public_page_primary_color, '#4169E1') as page_primary_color,
      coalesce(cs.public_page_secondary_color, '#1BAF9C') as page_secondary_color,
      cs.public_page_position_card_background_url as page_background_url,
      coalesce(cs.public_page_position_card_overlay_color, '#0F172A') as page_overlay_color,
      coalesce(cs.public_page_position_card_text_color, '#FFFFFF') as page_text_color,
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
    wait_available as estimated_wait_available,
    page_primary_color as public_page_primary_color,
    page_secondary_color as public_page_secondary_color,
    case
      when can_show_details then page_background_url
      else null
    end as public_page_position_card_background_url,
    page_overlay_color as public_page_position_card_overlay_color,
    page_text_color as public_page_position_card_text_color
  from calculated;
$$;

revoke all on function public.get_public_customer_queue_entry(text) from public;
grant execute on function public.get_public_customer_queue_entry(text)
  to anon, authenticated, service_role;

commit;

-- # Como executar no SQL Editor do Supabase
-- Copie este arquivo completo, cole no SQL Editor e execute depois da migration
-- 026_add_estimated_wait_time.sql.
--
-- # Resultado esperado
-- Cada empresa possui cores e uma imagem publica propria. Admins so alteram
-- objetos dentro da pasta da propria company_id. A RPC publica devolve apenas
-- os cinco valores visuais vinculados a empresa encontrada pelo token.
