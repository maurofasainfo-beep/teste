-- # Objetivo
-- Endurecer a geracao de ticket_code da fila contra colisoes aleatorias.
--
-- # Problema
-- O ticket_code usa seis caracteres hexadecimais aleatorios por dia. A constraint
-- unique (company_id, ticket_code) protege a integridade, mas uma colisao rara
-- faria o cadastro falhar em horario de pico.
--
-- # SQL
create extension if not exists pgcrypto;

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
        upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

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

-- # Como executar no SQL Editor do Supabase
-- Copie este arquivo completo, cole no SQL Editor e execute depois da migration
-- 027_add_public_page_branding.sql.
--
-- # Resultado esperado
-- A fila continua usando o mesmo formato QYYYYMMDD-XXXXXX, mas o banco tenta
-- outro valor antes de deixar uma colisao rara derrubar o cadastro.
