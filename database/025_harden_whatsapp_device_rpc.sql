-- # Objetivo
-- Endurecer a RPC get_primary_whatsapp_device para impedir leitura autenticada
-- direta de dados sensiveis de dispositivos WhatsApp.
--
-- # Contexto
-- A funcao retorna setof whatsapp_devices, que inclui hashes de token, hashes de
-- signing secret e secret criptografado. A UI tenant lista dispositivos pela tabela
-- whatsapp_devices usando RLS. Esta RPC deve ser usada apenas por contexto server-side
-- com service_role.

create or replace function public.get_primary_whatsapp_device(target_company_id uuid)
returns setof public.whatsapp_devices
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if not (public.is_company_admin(target_company_id) or public.is_platform_admin()) then
      raise exception 'Acesso negado.';
    end if;
  end if;

  return query
  select d.*
  from public.whatsapp_devices d
  where d.company_id = target_company_id
    and d.is_primary_sender = true
    and d.status <> 'revoked'
  limit 1;
end;
$$;

revoke all on function public.get_primary_whatsapp_device(uuid) from public;
revoke all on function public.get_primary_whatsapp_device(uuid) from anon;
revoke all on function public.get_primary_whatsapp_device(uuid) from authenticated;
grant execute on function public.get_primary_whatsapp_device(uuid) to service_role;

-- # Como executar
-- Copie este arquivo completo no Supabase SQL Editor e execute manualmente.
-- A migration nao apaga dados e substitui apenas a definicao/permissoes da RPC.
