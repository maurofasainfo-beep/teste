# Banco de Dados

## Migracoes

Execute na ordem:

1. `database/001_create_companies.sql`
2. `database/002_create_profiles.sql`
3. `database/003_create_queue_entries.sql`
4. `database/004_create_message_templates.sql`
5. `database/005_create_message_events.sql`
6. `database/006_create_functions_triggers.sql`
7. `database/007_create_rls_policies.sql`
8. `database/008_create_indexes_realtime.sql`
9. `database/009_fix_queue_ticket_generation.sql`
10. `database/010_create_platform_profiles.sql`
11. `database/011_create_platform_functions.sql`
12. `database/012_create_platform_rls_policies.sql`

Alteracoes futuras devem criar novos arquivos:

```text
013_nome_da_migracao.sql
014_nome_da_migracao.sql
015_nome_da_migracao.sql
```

Nunca edite uma migracao antiga depois de aplicada em producao.

## Tabelas

`platform_profiles`: usuarios da empresa proprietaria do SaaS. Nao possui `company_id`.

`companies`: empresas/tenants clientes.

`profiles`: vinculo entre `auth.users` e empresa cliente.

`queue_entries`: clientes na fila.

`message_templates`: modelos por empresa.

`message_events`: auditoria de mensagens.

## Multi-Tenant

Toda tabela operacional de cliente possui `company_id`.

As policies dos tenants usam:

- `public.is_company_member(company_id)`
- `public.is_company_admin(company_id)`
- `auth.uid()`

## Administracao da Plataforma

`platform_profiles` separa a equipe da empresa SaaS dos usuarios das empresas clientes.

Campos:

- `id`
- `user_id`
- `name`
- `email`
- `role`
- `status`
- `created_at`
- `updated_at`

Roles:

- `owner`
- `admin`
- `support`

Status:

- `active`
- `inactive`

Funcoes:

- `is_platform_owner()`
- `is_platform_admin()`
- `is_platform_support()`
- `is_platform_user()`

As policies de `platform_profiles` usam essas funcoes. As tabelas dos tenants continuam protegidas por `company_id`; usuarios da plataforma acessam dados globais apenas por actions server-side autorizadas.

## Display Publico

O publico nao recebe `select` direto em `queue_entries`.

As RPCs publicas sao:

- `get_public_company(queue_slug text)`
- `get_public_queue_entries(queue_slug text)`

Elas retornam apenas dados necessarios para o display.

## Link Individual do Cliente

Novas migrations:

- `database/013_add_party_size_to_queue_entries.sql`
- `database/014_add_public_customer_token_to_queue_entries.sql`
- `database/015_add_queue_link_expiration_settings.sql`
- `database/016_update_message_events_for_customer_links.sql`
- `database/017_update_public_customer_queue_link_rls.sql`

Novos campos em `queue_entries`:

- `party_size`
- `public_customer_token`
- `cancelled_by_customer`

Nova tabela:

- `company_settings`

Novas RPCs publicas:

- `get_public_customer_queue_entry(customer_token text)`
- `cancel_public_customer_queue_entry(customer_token text)`

O publico continua sem `select` direto em `queue_entries`.
