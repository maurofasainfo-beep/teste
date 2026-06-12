-- # Objetivo
-- Corrigir a geração automática do ticket_code da fila no Supabase.
--
-- # Explicação
-- A função gen_random_bytes pertence à extensão pgcrypto. Em projetos Supabase,
-- a resolução dessa função pode variar conforme o schema da extensão. Como a
-- função set_queue_entry_defaults usa search_path = public, a chamada sem schema
-- pode falhar com: function gen_random_bytes(integer) does not exist.
--
-- Esta migração substitui a geração por gen_random_uuid(), que já é usado nos
-- defaults das tabelas e evita depender de gen_random_bytes.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 009.
--
-- # SQL
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
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
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

-- # Resultado Esperado
-- A função do trigger da fila passa a gerar ticket_code sem erro no Supabase.
