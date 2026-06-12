-- # Objetivo
-- Criar a tabela message_templates para mensagens futuras.
--
-- # Explicação
-- Templates são por empresa e suportam os eventos queue_created e customer_released.
-- As variáveis suportadas ficam no conteúdo: {{nome_cliente}}, {{telefone_cliente}},
-- {{nome_empresa}}, {{codigo_senha}} e {{link_fila}}.
--
-- # Executar
-- Copiar e colar este arquivo no SQL Editor do Supabase como migração 004.
--
-- # SQL
do $$
begin
  create type public.message_template_type as enum ('queue_created', 'customer_released');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type public.message_template_type not null,
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- # Resultado Esperado
-- Tabela message_templates criada para templates multi-tenant.
