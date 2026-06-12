-- # Objetivo
-- Endurecer a expiracao publica do link individual do cliente.
--
-- # Explicacao
-- A funcao get_public_customer_queue_entry ja calculava expires_at e is_expired
-- com base em released_at + released_link_expiration_minutes. Esta atualizacao
-- mantem o mesmo contrato, mas so retorna detalhes do atendimento quando o link
-- ainda pode exibir dados: status waiting ou status released antes da expiracao.
-- Apos expirado, concluido ou cancelado, dados como nome, telefone, codigo,
-- posicao, quantidade e horario de entrada deixam de ser retornados.
--
-- # SQL completo
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
  ),
  visibility as (
    select
      *,
      (
        status = 'waiting'
        or (status = 'released' and is_expired = false)
      ) as can_show_details
    from matched
  )
  select
    id,
    case when can_show_details then customer_name else null end as customer_name,
    case when can_show_details then public.mask_customer_phone(customer_phone) else null end as masked_customer_phone,
    case when can_show_details then ticket_code else null end as ticket_code,
    status,
    case when can_show_details then "position" else null end as "position",
    case when can_show_details then party_size else null end as party_size,
    company_trade_name,
    public_queue_slug,
    case when can_show_details then created_at else null end as created_at,
    case when status = 'released' and is_expired = false then released_at else null end as released_at,
    cancelled_at,
    completed_at,
    expiration_minutes,
    expires_at,
    is_expired
  from visibility;
$$;

grant execute on function public.get_public_customer_queue_entry(text) to anon, authenticated;

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor do Supabase e executar apos
-- a migration 023_create_whatsapp_indexes.sql.
--
-- # Resultado esperado
-- O link individual continua mostrando dados enquanto o cliente esta waiting ou
-- released dentro do prazo configurado. Apos expirar, concluir ou cancelar, a
-- funcao publica retorna apenas dados minimos para a tela final.
