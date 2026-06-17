# PROJECT_FULL_DOCUMENTATION.md

Documentacao completa e atualizada do projeto Queue SaaS, gerada a partir do estado atual do repositorio `C:\Users\User\queue-saas`.

## Indice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Estado Atual do Projeto](#2-estado-atual-do-projeto)
3. [Arquitetura Geral](#3-arquitetura-geral)
4. [Stack Tecnologica](#4-stack-tecnologica)
5. [Estrutura de Pastas](#5-estrutura-de-pastas)
6. [Banco de Dados](#6-banco-de-dados)
7. [Sistema Multi-Tenant](#7-sistema-multi-tenant)
8. [Sistema de Fila](#8-sistema-de-fila)
9. [Pagina Publica do Cliente](#9-pagina-publica-do-cliente)
10. [Display Publico](#10-display-publico)
11. [Templates](#11-templates)
12. [Sistema de Notificacoes](#12-sistema-de-notificacoes)
13. [Integracao WhatsApp / QWEP](#13-integracao-whatsapp--qwep)
14. [Desktop Bot Electron](#14-desktop-bot-electron)
15. [Extensao Chrome](#15-extensao-chrome)
16. [Fluxo Completo do Sistema](#16-fluxo-completo-do-sistema)
17. [Seguranca](#17-seguranca)
18. [Scripts e Execucao](#18-scripts-e-execucao)
19. [Funcionalidades Implementadas](#19-funcionalidades-implementadas)
20. [Funcionalidades Pendentes](#20-funcionalidades-pendentes)
21. [Problemas Conhecidos](#21-problemas-conhecidos)
22. [Roadmap Recomendado](#22-roadmap-recomendado)
23. [Conclusao](#23-conclusao)

---

## 1. Resumo Executivo

O Queue SaaS e um sistema SaaS multiempresa para gerenciamento de filas de atendimento. O produto permite que empresas clientes cadastrem pessoas em uma fila, chamem/liberem clientes, exibam a fila em um display publico e enviem notificacoes por WhatsApp Web por meio de infraestrutura QWEP e bot desktop/Chrome.

Objetivo principal:

- Gerenciar filas por empresa/tenant com isolamento de dados.
- Permitir operacao em tempo real para funcionarios.
- Oferecer display publico para clientes finais.
- Gerar link individual por cliente.
- Preparar e executar notificacoes por WhatsApp Web via QWEP.

Problema que resolve:

- Substitui controle manual de filas, senhas e chamadas por um fluxo operacional digital.
- Reduz necessidade de atualizar telas manualmente.
- Permite que o cliente acompanhe sua posicao por link individual.
- Centraliza templates de mensagens e prepara automacao por WhatsApp.

Publico-alvo:

- Empresas que atendem clientes por ordem de chegada ou fila.
- Balcoes de atendimento, restaurantes, assistencias, clinicas, lojas e operacoes locais.
- Empresa proprietaria do SaaS, que gerencia empresas clientes pela area `/platform`.

---

## 2. Estado Atual do Projeto

Estagio atual: **Beta tecnico / producao parcial**.

Justificativa:

- O SaaS principal esta funcional: login, tenants, fila, display publico, templates, link individual, painel operacional, configuracoes e administracao da plataforma existem no codigo.
- O banco possui migracoes estruturadas ate `024`, RLS, RPCs publicas limitadas, indices e suporte QWEP.
- Existe Desktop Bot Electron com build `.exe`, system tray, armazenamento local e fluxo QWEP.
- Existe extensao Chrome Manifest V3 ainda mantida no repositorio.
- O envio por WhatsApp Web depende de APIs internas do WhatsApp Web, o que torna a camada de envio sensivel a mudancas externas.
- Rate limit QWEP e controle de nonce sao em memoria, adequados para MVP/beta, mas nao ideais para ambiente distribuido.
- Nao foi encontrada suite automatizada de testes de negocio; a validacao atual se apoia em `lint`, `build`, roteiro manual e smoke tests.

Funcionalidades concluidas:

- Next.js App Router com rotas de SaaS, plataforma, publicas e APIs.
- Supabase Auth e Supabase PostgreSQL.
- Multi-tenancy por `company_id`.
- `platform_profiles` separado de `profiles`.
- Dashboard do tenant.
- Painel operacional com cards.
- Display publico realtime.
- Link individual do cliente.
- Expiracao do link apos liberacao.
- Templates editaveis por empresa.
- NotificationProvider configuravel.
- Eventos `message_events`.
- Backend QWEP para dispositivos WhatsApp.
- Desktop Bot Electron.
- Extensao Chrome MV3.
- Deploy preparado para Netlify por `netlify.toml`.

Funcionalidades em validacao:

- Envio automatico via Desktop Bot usando API interna do WhatsApp Web.
- Envio automatico via extensao Chrome.
- Robustez de QWEP em deploy publico.
- Confiabilidade do envio sem navegar para `/send`.

Modulos incompletos ou planejados:

- Evolution API real.
- API Oficial WhatsApp.
- SMS.
- Rate limit distribuido.
- Observabilidade centralizada.
- Failover automatico entre dispositivos primary sender.
- Logs globais mais completos para a plataforma.
- Upload de logos/banners via Storage.

---

## 3. Arquitetura Geral

O projeto e composto por:

- Frontend SaaS em Next.js App Router.
- Backend em Server Actions e Route Handlers do Next.js.
- Supabase como Auth, PostgreSQL, Realtime e RLS.
- Desktop Bot Electron como cliente QWEP e executor WhatsApp Web.
- Extensao Chrome Manifest V3 como conector alternativo.
- Banco PostgreSQL com tabelas multi-tenant e QWEP.

Diagrama geral:

```text
                         +-------------------------------+
                         |        Empresa SaaS           |
                         | /platform                     |
                         | platform_profiles             |
                         +---------------+---------------+
                                         |
                                         | service role server-side
                                         v
+----------------+        +-------------+-------------+        +----------------+
| Usuario tenant | -----> | Next.js SaaS App           | -----> | Supabase Auth  |
| admin/employee |        | App Router + Server Actions|        +----------------+
+----------------+        +-------------+-------------+
                                         |
                                         | SQL/RPC/RLS/Realtime
                                         v
                         +---------------+----------------+
                         | Supabase PostgreSQL            |
                         | companies, profiles            |
                         | queue_entries                  |
                         | message_templates              |
                         | message_events                 |
                         | whatsapp_devices/logs          |
                         +---+------------------------+---+
                             |                        |
               public RPC    |                        | QWEP APIs
                             v                        v
                +------------+-----------+     +------+-------------------+
                | Display / Cliente      |     | Desktop Bot Electron     |
                | /display/{slug}        |     | ou Extensao Chrome       |
                | /queue/customer/{token}|     | WhatsApp Web Automation  |
                +------------------------+     +-------------+------------+
                                                              |
                                                              v
                                                   +----------+-----------+
                                                   | WhatsApp Web         |
                                                   | API interna/Store    |
                                                   +----------------------+
```

Fluxo entre modulos:

1. Usuario autenticado acessa o SaaS.
2. Server Action valida sessao e tenant.
3. Dados sao gravados no Supabase com `company_id`.
4. Triggers/RPCs mantem posicoes, broadcast e tokens publicos.
5. NotificationProvider cria `message_events`.
6. Desktop Bot/Extensao autentica por QWEP.
7. Bot reserva mensagens pendentes.
8. Bot envia pelo WhatsApp Web.
9. Bot envia ACK ao backend.
10. `message_events` muda para `sent`, `retry` ou `failed`.

---

## 4. Stack Tecnologica

| Area | Tecnologia |
|---|---|
| Frontend SaaS | Next.js `16.2.9`, React `19.2.4`, TypeScript |
| UI | Tailwind CSS 4, componentes locais estilo Shadcn UI, lucide-react |
| Animacoes | Framer Motion |
| Backend SaaS | Next.js Server Actions e Route Handlers |
| Auth | Supabase Auth |
| Banco | Supabase PostgreSQL |
| Realtime | Supabase Realtime, Postgres Changes e Broadcast |
| Validacao | Zod |
| Supabase Client | `@supabase/ssr`, `@supabase/supabase-js` |
| Desktop Bot | Electron `42.4.0` |
| Build Desktop | electron-builder |
| Extensao | Chrome Extension Manifest V3 |
| Deploy Web | Netlify com `@netlify/plugin-nextjs`; docs antigas tambem citam Vercel |
| Criptografia QWEP | Node `crypto`, HMAC SHA-256, AES-256-GCM |

---

## 5. Estrutura de Pastas

```text
queue-saas/
  src/
    app/
      (app)/                 Area autenticada das empresas clientes
      (platform)/            Area da empresa proprietaria do SaaS
      api/                   Route Handlers REST/QWEP/fila
      auth/redirect/         Resolucao de pos-login
      display/[slug]/        Display publico da fila
      queue/customer/[token]/ Link individual do cliente
      login/                 Login geral
      onboarding/            Criacao inicial de empresa tenant
    components/
      auth/                  Componentes de login
      customer-queue/        UI do link individual
      dashboard/             Dashboard realtime
      display/               Display publico
      layout/                Shells e navegacao
      platform/              Shell da plataforma
      queue/                 Painel operacional
      settings/              WhatsApp devices/configuracoes
      templates/             Edicao de templates
      ui/                    Componentes base
      users/                 Gestao de usuarios tenant
    lib/
      auth/                  Sessao tenant e plataforma
      notifications/         NotificationProvider e providers
      phone.ts               Helpers de telefone brasileiro
      platform/              Actions/permissoes da plataforma
      qwep/                  Auth, HMAC, crypto, rate-limit, replay
      queue/                 Link individual e actions de fila
      supabase/              Clientes server/browser/admin
      types/database.ts      Tipos do schema
      validation.ts          Schemas Zod
  database/                  Migracoes SQL e script de limpeza
  desktop-bot/               App Electron Windows
  extension/                 Extensao Chrome MV3
  docs/                      Pasta reservada/documental
  public/                    Assets padrao
```

Arquivos de documentacao existentes:

- `README.md`
- `ARQUITETURA.md`
- `BANCO_DE_DADOS.md`
- `FLUXOS.md`
- `PERMISSOES.md`
- `SUPABASE_SETUP.md`
- `DEPLOY.md`
- `CUSTOMER_QUEUE_LINK.md`
- `NOTIFICATION_FLOW.md`
- `SUPABASE_MIGRATIONS.md`
- `WHATSAPP_EXTENSION_BACKEND.md`
- `WHATSAPP_DEVICE_SETUP.md`
- `MESSAGE_FLOW.md`
- `SECURITY_MODEL.md`
- `extension/README.md`
- `desktop-bot/README.md`

---

## 6. Banco de Dados

### 6.1 Migracoes

| Arquivo | Responsabilidade |
|---|---|
| `001_create_companies.sql` | Cria `companies` e enum de status da empresa |
| `002_create_profiles.sql` | Cria `profiles` com role/status tenant |
| `003_create_queue_entries.sql` | Cria `queue_entries` |
| `004_create_message_templates.sql` | Cria `message_templates` |
| `005_create_message_events.sql` | Cria `message_events` inicial |
| `006_create_functions_triggers.sql` | Funcoes, triggers, RPCs publicas e broadcast |
| `007_create_rls_policies.sql` | RLS tenant |
| `008_create_indexes_realtime.sql` | Indices e Supabase Realtime |
| `009_fix_queue_ticket_generation.sql` | Corrige geracao de ticket sem `gen_random_bytes` |
| `010_create_platform_profiles.sql` | Cria `platform_profiles` |
| `011_create_platform_functions.sql` | Funcoes `is_platform_*` |
| `012_create_platform_rls_policies.sql` | RLS de `platform_profiles` |
| `013_add_party_size_to_queue_entries.sql` | Adiciona `party_size` |
| `014_add_public_customer_token_to_queue_entries.sql` | Adiciona token publico e cancelamento pelo cliente |
| `015_add_queue_link_expiration_settings.sql` | Cria `company_settings` e expiracao do link |
| `016_update_message_events_for_customer_links.sql` | Adiciona `simulated` e `skipped` |
| `017_update_public_customer_queue_link_rls.sql` | RPCs publicas do cliente e RLS de settings |
| `018_create_whatsapp_devices.sql` | Cria `whatsapp_devices` |
| `019_create_whatsapp_device_logs.sql` | Cria `whatsapp_device_logs` |
| `020_update_message_events_for_qwep.sql` | Campos/status QWEP em `message_events` |
| `021_create_whatsapp_device_functions.sql` | Funcoes primary/revoke/reserva |
| `022_create_whatsapp_device_rls_policies.sql` | RLS para dispositivos/logs |
| `023_create_whatsapp_indexes.sql` | Indices QWEP/dispositivos |
| `024_update_public_customer_link_expiration.sql` | Oculta dados sensiveis apos expiracao/finalizacao |
| `999_cleanup_operational_test_data.sql` | Limpa apenas dados operacionais de teste |

### 6.2 Tabelas

#### `companies`

Armazena empresas clientes.

Campos principais:

- `id`
- `cnpj`
- `corporate_name`
- `trade_name`
- `email`
- `phone`
- `status`: `active` ou `inactive`
- `public_queue_slug`
- `created_at`
- `updated_at`

Restricoes:

- CNPJ com 14 digitos.
- Slug publico unico e no formato `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- CNPJ unico.
- Slug unico.

#### `profiles`

Representa usuarios das empresas clientes.

Campos:

- `id`
- `user_id` referencia `auth.users`
- `company_id`
- `name`
- `email`
- `role`: `admin` ou `employee`
- `status`: `active` ou `inactive`
- timestamps

Restricoes:

- `user_id` unico.
- `company_id + email` unico.

#### `platform_profiles`

Representa usuarios da empresa proprietaria do SaaS.

Campos:

- `id`
- `user_id`
- `name`
- `email`
- `role`: `owner`, `admin`, `support`
- `status`: `active`, `inactive`
- timestamps

Nao possui `company_id`.

#### `company_settings`

Configuracoes operacionais por empresa.

Campos:

- `company_id`
- `released_link_expiration_minutes`
- `notification_channel`
- `created_at`
- `updated_at`

Restricoes:

- `released_link_expiration_minutes` entre 1 e 60.
- `notification_channel`: `none`, `simulated`, `whatsapp_extension`, `evolution_api`, `sms`.

#### `queue_entries`

Representa clientes na fila.

Campos:

- `id`
- `company_id`
- `customer_name`
- `customer_phone`
- `ticket_code`
- `status`: `waiting`, `released`, `completed`, `cancelled`
- `position`
- `party_size`
- `public_customer_token`
- `cancelled_by_customer`
- `created_by`
- `released_by`
- `created_at`
- `released_at`
- `completed_at`
- `cancelled_at`

Restricoes:

- `position` nulo ou positivo.
- `company_id + ticket_code` unico.
- `party_size` entre 1 e 20.
- `public_customer_token` tem 64 caracteres hexadecimais e indice unico.

#### `message_templates`

Templates por empresa.

Campos:

- `id`
- `company_id`
- `type`: `queue_created`, `customer_released`
- `title`
- `content`
- `active`
- timestamps

Indice unico parcial:

- Apenas um template ativo por `company_id + type`.

#### `message_events`

Eventos de mensageria/notificacao.

Campos principais:

- `id`
- `company_id`
- `queue_entry_id`
- `provider`: `none`, `whatsapp_extension`, `evolution_api`, `sms`
- `channel`
- `type`: `queue_created`, `customer_released`
- `payload`
- `status`
- `device_id`
- `reservation_id`
- `reservation_token_hash`
- `reserved_at`
- `reservation_expires_at`
- `processing_started_at`
- `sent_at`
- `failed_at`
- `attempt_count`
- `max_attempts`
- `next_retry_at`
- `idempotency_key`
- `provider_response`
- `error_message`
- `created_at`

Status suportados:

- `recorded`
- `pending`
- `reserved`
- `processing`
- `retry`
- `cancelled`
- `expired`
- `simulated`
- `skipped`
- `sent`
- `failed`

#### `whatsapp_devices`

Dispositivos QWEP por empresa.

Campos:

- `id`
- `company_id`
- `name`
- `token_hash`
- `signing_secret_hash`
- `signing_secret_encrypted`
- `status`
- `is_primary_sender`
- `connected_phone`
- `browser_name`
- `user_agent`
- `extension_version`
- `last_seen_at`
- `last_connected_at`
- `last_disconnected_at`
- `created_by`
- timestamps
- `revoked_at`

Status:

- `created`
- `pending_activation`
- `active`
- `disconnected`
- `error`
- `revoked`
- `expired`

#### `whatsapp_device_logs`

Logs operacionais sanitizados.

Campos:

- `id`
- `company_id`
- `device_id`
- `event_type`
- `message`
- `metadata`
- `created_at`

Eventos suportados:

- `device_created`
- `device_activated`
- `device_revoked`
- `heartbeat_received`
- `message_batch_reserved`
- `message_sent_ack`
- `message_failed_ack`
- `auth_failed`
- `device_error`
- `primary_sender_changed`
- `rate_limited`

### 6.3 RPCs e funcoes

Funcoes de tenant/RLS:

- `current_profile_id()`
- `current_company_id()`
- `is_company_member(target_company_id)`
- `is_company_admin(target_company_id)`
- `is_platform_owner()`
- `is_platform_admin()`
- `is_platform_support()`
- `is_platform_user()`

Fila e realtime:

- `set_updated_at()`
- `set_queue_entry_defaults()`
- `renumber_waiting_queue(target_company_id)`
- `after_queue_entry_change()`
- `emit_public_queue_broadcast()`

RPCs publicas:

- `get_public_company(queue_slug)`
- `get_public_queue_entries(queue_slug)`
- `get_public_customer_queue_entry(customer_token)`
- `cancel_public_customer_queue_entry(customer_token)`
- `mask_customer_phone(raw_phone)`

QWEP:

- `get_primary_whatsapp_device(target_company_id)`
- `set_primary_whatsapp_device(target_device_id)`
- `revoke_whatsapp_device(target_device_id)`
- `release_expired_message_reservations()`
- `reserve_pending_message_events(target_device_id, batch_limit)`

Observacao:

- A rota `GET /api/extension/messages/pending` implementa reserva no codigo Next.js atual, usando queries diretas em `message_events`; a funcao SQL de reserva tambem existe para uso server-side. Ambas devem ser mantidas consistentes.

### 6.4 Indices relevantes

Tenant e fila:

- `companies_public_queue_slug_idx`
- `profiles_company_id_idx`
- `profiles_user_id_idx`
- `queue_entries_company_status_position_idx`
- `queue_entries_company_created_at_idx`
- `queue_entries_company_released_at_idx`
- `queue_entries_public_customer_token_idx`

Templates/eventos:

- `message_templates_company_type_idx`
- `message_templates_one_active_per_type_idx`
- `message_events_company_created_at_idx`
- `message_events_queue_entry_id_idx`
- `message_events_qwep_pending_idx`
- `message_events_qwep_reservation_idx`
- `message_events_idempotency_key_unique_idx`

WhatsApp devices:

- `whatsapp_devices_one_primary_per_company_idx`
- `whatsapp_devices_company_status_idx`
- `whatsapp_devices_token_hash_idx`
- `whatsapp_device_logs_company_created_idx`
- `whatsapp_device_logs_device_created_idx`

### 6.5 RLS

RLS ativo em:

- `companies`
- `profiles`
- `queue_entries`
- `message_templates`
- `message_events`
- `platform_profiles`
- `company_settings`
- `whatsapp_devices`
- `whatsapp_device_logs`

Regras principais:

- Usuario tenant acessa apenas `company_id` vinculado ao perfil ativo.
- Admin tenant pode atualizar empresa, perfis, templates, settings e dispositivos da propria empresa.
- Employee pode operar fila, mas nao gerenciar configuracoes/templates/usuarios.
- Publico anon nao recebe `select` direto em tabelas operacionais.
- Display e link individual usam RPCs limitadas.
- Usuario da plataforma usa `platform_profiles` sem `company_id`.
- Extensao/bot nao acessa Supabase diretamente; usa apenas APIs Next.js.

---

## 7. Sistema Multi-Tenant

O isolamento principal acontece por `company_id`.

Tabelas tenant:

- `profiles`
- `queue_entries`
- `message_templates`
- `message_events`
- `company_settings`
- `whatsapp_devices`
- `whatsapp_device_logs`

Separacao de contextos:

```text
auth.users
  platform_profiles  -> usuarios da empresa SaaS
  profiles           -> usuarios das empresas clientes
```

Fluxo de login:

1. Usuario autentica via Supabase Auth.
2. `/auth/redirect` chama `getPostLoginRedirectPath()`.
3. Primeiro verifica `platform_profiles`.
4. Se existir perfil de plataforma ativo, redireciona para `/platform/dashboard`.
5. Caso contrario verifica `profiles`.
6. Se existir perfil tenant ativo, redireciona para `/dashboard`.
7. Caso contrario, vai para `/onboarding`.

Permissoes tenant:

| Papel | Acesso |
|---|---|
| `admin` | Dashboard, operacao, empresa, usuarios, templates, configuracoes, WhatsApp devices |
| `employee` | Dashboard e operacao de fila |

Permissoes plataforma:

| Papel | Acesso |
|---|---|
| `owner` | Gerencia tudo, inclusive usuarios da plataforma |
| `admin` | Gerencia empresas clientes, admin inicial e reset de acesso |
| `support` | Visualiza dados globais, sem gestao administrativa sensivel |

---

## 8. Sistema de Fila

### Cadastro

O funcionario/admin cadastra:

- Nome do cliente.
- Telefone.
- Quantidade de pessoas.

Valiacoes:

- Nome com minimo de 2 caracteres.
- Telefone brasileiro normalizado por `normalizeBrazilianPhone`.
- `party_size` inteiro entre 1 e 20.

O telefone e armazenado internamente no formato internacional sem `+`, exemplo:

```text
5515998123456
```

### Geracao de senha e posicao

O trigger `set_queue_entry_defaults()`:

- Gera `ticket_code` no formato `QYYYYMMDD-XXXXXX`.
- Define `status = waiting` se ausente.
- Calcula a proxima posicao da fila para a empresa.
- Usa `pg_advisory_xact_lock(hashtext(company_id))` para reduzir colisao em concorrencia.

### Reordenacao

O trigger `after_queue_entry_change()` chama:

```sql
renumber_waiting_queue(company_id)
```

Assim, clientes em `waiting` sao reordenados por `created_at, id`.

### Status

| Status | Significado |
|---|---|
| `waiting` | Cliente aguardando na fila |
| `released` | Cliente chamado/liberado para atendimento |
| `completed` | Atendimento concluido |
| `cancelled` | Entrada cancelada |

### Chamada/liberacao

`releaseQueueEntryAction` e `POST /api/queue/[id]/status`:

- Atualizam `status = released`.
- Gravam `released_by`.
- Gravam `released_at`.
- Limpam `completed_at` e `cancelled_at`.
- Criam notificacao `customer_released`.

### Conclusao

`completeQueueEntryAction`:

- Permite concluir `waiting` ou `released`.
- Define `status = completed`.
- Grava `completed_at`.

### Cancelamento

`cancelQueueEntryAction`:

- Permite cancelar `waiting` ou `released`.
- Define `status = cancelled`.
- Grava `cancelled_at`.
- Define `cancelled_by_customer = false`.

Cancelamento publico:

- RPC `cancel_public_customer_queue_entry(customer_token)`.
- So funciona se `status = waiting`.
- Define `cancelled_by_customer = true`.

### Tempos configuraveis

Em `company_settings`:

- `released_link_expiration_minutes`: de 1 a 60, padrao 5.
- Define por quanto tempo o link individual continua exibindo dados depois de `released_at`.

### Regras de prioridade

Nao foi encontrada implementacao de prioridade customizada alem da ordem de entrada. A confirmar se havera prioridade por tipo de cliente ou regras manuais futuras.

---

## 9. Pagina Publica do Cliente

Rota:

```text
/queue/customer/[token]
```

Arquivos:

- `src/app/queue/customer/[token]/page.tsx`
- `src/components/customer-queue/customer-status-card.tsx`
- `src/components/customer-queue/leave-queue-dialog.tsx`
- `src/components/customer-queue/customer-link-actions.tsx`

### Link unico

Cada `queue_entry` recebe:

- `public_customer_token`: 64 caracteres hexadecimais.

O link e montado por:

```ts
buildCustomerQueueLink(token)
```

com base em `NEXT_PUBLIC_APP_URL`.

### Busca segura

A pagina publica nao faz `select` direto em `queue_entries`.

Ela chama:

```sql
get_public_customer_queue_entry(customer_token)
```

### Dados exibidos

Quando valido:

- Nome da empresa.
- Nome do cliente.
- Posicao.
- Quantidade de pessoas.
- Telefone mascarado.
- Status.
- Codigo discreto, se retornado.
- Tempo restante quando chamado.

Telefone completo nunca e exposto na pagina publica.

### Estados

| Estado visual | Comportamento |
|---|---|
| `waiting` | Exibe dados, posicao e botao "Sair da fila" |
| `released` | Exibe "Voce foi chamado", tempo restante e remove botao de sair |
| `expired` | Mostra mensagem de expiracao e oculta dados sensiveis |
| `cancelled` | Mostra mensagem final de saida/cancelamento |
| `completed` | Mostra atendimento finalizado |

### Expiracao

Nao existe status fisico `expired` em `queue_entries`.

O estado expirado e derivado por:

```text
released_at + released_link_expiration_minutes
```

A migration `024` endurece a RPC para retornar dados minimos quando:

- Link expirou.
- Atendimento foi concluido.
- Atendimento foi cancelado.

### Realtime

A pagina assina o canal publico:

```text
public-customer-queue:{token}
```

O trigger `emit_public_queue_broadcast()` emite broadcast quando a fila muda.

### Design responsivo

O componente atual e mobile-first:

- Container maximo de 430px.
- Card principal arredondado.
- Posicao como elemento principal.
- Grade compacta 2x2.
- Botoes compactos.

---

## 10. Display Publico

Rota:

```text
/display/[slug]
```

Arquivos:

- `src/app/display/[slug]/page.tsx`
- `src/components/display/public-display-board.tsx`

Busca:

- `get_public_company(queue_slug)`
- `get_public_queue_entries(queue_slug)`

Dados exibidos:

- Empresa.
- Coluna `NA FILA`.
- Coluna `LIBERADOS`.
- Nome do cliente.
- Ticket/senha.
- Posicao.
- Quantidade de pessoas.

Nao exibe telefone.

Realtime:

- Canal publico `public-display:{slug}`.
- Evento broadcast `queue_changed`.

Animacao ao liberar:

- Overlay central.
- Texto "Cliente liberado".
- Nome do cliente.
- Ticket.
- Destaque visual com glow.
- Duracao aproximada de 5 segundos.

Recursos visuais:

- Tema claro/escuro.
- Modo TV.
- Botao fullscreen.
- Framer Motion.

---

## 11. Templates

Templates disponiveis:

| Type | Nome na UI | Quando e usado |
|---|---|---|
| `queue_created` | Cliente entrou na fila | Ao cadastrar cliente |
| `customer_released` | Cliente liberado | Ao chamar/liberar cliente |

Variaveis suportadas:

- `{{nome_cliente}}`
- `{{telefone_cliente}}`
- `{{nome_empresa}}`
- `{{codigo_senha}}`
- `{{link_fila}}`
- `{{quantidade_pessoas}}`
- `{{posicao_fila}}`

Arquivos:

- `src/components/templates/template-workspace.tsx`
- `src/lib/notifications/message-templates.ts`
- `src/lib/message-template-defaults.ts`
- `src/app/actions.ts` (`upsertTemplateAction`)

Renderizacao:

1. Provider chama `renderNotificationMessage(type, context)`.
2. O sistema busca template ativo por empresa e tipo via `getCompanyMessageTemplate`.
3. Se nao existir template ativo, usa fallback em `DEFAULT_MESSAGE_TEMPLATE_CONTENT`.
4. `renderMessageTemplate` substitui variaveis conhecidas.
5. Variaveis desconhecidas permanecem no texto, pois a funcao retorna o `match` original quando a chave nao existe.

Fallbacks atuais:

```text
queue_created:
Ola {{nome_cliente}}, voce esta na posicao {{posicao_fila}} da fila da {{nome_empresa}}. Acompanhe: {{link_fila}}

customer_released:
{{nome_cliente}}, chegou sua vez! Compareca ao atendimento. Acompanhe: {{link_fila}}
```

Processo de edicao:

- Apenas admin tenant acessa `/templates`.
- Templates sao exibidos como cards.
- Edicao ocorre em Drawer.
- `upsertTemplateAction` mantem no maximo um ativo por tipo/empresa.

---

## 12. Sistema de Notificacoes

Arquivos:

- `src/lib/notifications/notification-provider.ts`
- `src/lib/notifications/get-notification-provider.ts`
- `src/lib/notifications/configured-notification-provider.ts`
- `src/lib/notifications/noop-notification-provider.ts`
- `src/lib/notifications/extension-whatsapp-provider.ts`
- `src/lib/notifications/message-templates.ts`

Interface:

```ts
NotificationProvider
  sendQueueCreatedMessage(context)
  sendCustomerReleasedMessage(context)
```

Providers atuais:

| Provider | Quando usado | Efeito |
|---|---|---|
| `DisabledNotificationProvider` | `notification_channel = none` | Cria evento `skipped` com provider `none` |
| `NoopNotificationProvider` | `simulated`, `evolution_api`, `sms` enquanto nao ha provider real | Cria evento `simulated` |
| `ExtensionWhatsAppProvider` | `whatsapp_extension` | Cria evento `pending` para bot/extensao |

Observacao:

- `evolution_api` e `sms` existem como valores de configuracao, mas ainda caem no `NoopNotificationProvider`. Implementacao real esta pendente.

Payload gerado:

- `type`
- `variables`
- `message`
- `customer_name`
- `customer_phone`
- `recipient_phone`
- `ticket_code`
- `party_size`
- `position`
- `customer_link`
- `company_name`
- `released_at` para `customer_released`

Telefone:

- Sempre normalizado por `normalizeBrazilianPhone`.

Status por canal:

| Canal | provider | status inicial |
|---|---|---|
| `none` | `none` | `skipped` |
| `simulated` | `none` | `simulated` |
| `whatsapp_extension` | `whatsapp_extension` | `pending` |
| `evolution_api` | `none` atualmente | `simulated` |
| `sms` | `none` atualmente | `simulated` |

---

## 13. Integracao WhatsApp / QWEP

QWEP v1 e o protocolo entre SaaS e clientes de envio (Desktop Bot ou extensao).

### APIs

| Endpoint | Metodo | Responsabilidade |
|---|---|---|
| `/api/extension/auth/validate` | POST | Valida token/signing secret, ativa dispositivo e retorna configuracoes |
| `/api/extension/messages/pending` | GET | Autentica, exige primary sender, reserva mensagens pendentes |
| `/api/extension/messages/:id/ack` | POST | Confirma processing/sent/failed |
| `/api/extension/status/heartbeat` | POST | Atualiza status do dispositivo e WhatsApp |

### Autenticacao

`auth/validate` recebe:

- `token`
- `signing_secret`
- `extension_version`
- `browser_name`
- `user_agent`

O servidor:

- Calcula `hashDeviceToken(token)`.
- Busca `whatsapp_devices.token_hash`.
- Verifica empresa ativa.
- Bloqueia `revoked`, `expired`, `error`.
- Compara `signing_secret` se houver hash.
- Ativa `pending_activation`/`created` para `active`.
- Atualiza `last_seen_at`.
- Retorna `device_id`, `company_name`, `status`, `is_primary_sender`, intervalos e `server_time`.

### HMAC

Requests operacionais usam:

```text
Authorization: Bearer {token}
X-QWEP-Version: 1
X-QWEP-Timestamp: {unix_ms}
X-QWEP-Nonce: {nonce}
X-QWEP-Body-SHA256: {sha256(body)}
X-QWEP-Signature: {hmac}
```

String canonica:

```text
METHOD
PATHNAME
TIMESTAMP
NONCE
BODY_SHA256
```

Validacoes:

- Timestamp com tolerancia de 5 minutos.
- Nonce em memoria para evitar replay.
- Body hash.
- HMAC SHA-256 com signing secret descriptografado.

### Reserva de mensagens

`GET /api/extension/messages/pending`:

- Exige dispositivo autenticado.
- Exige `is_primary_sender = true`.
- Filtra `provider = whatsapp_extension`.
- Aceita apenas `pending` e `retry` disponivel.
- Limita lote de 1 a 10, mas bots atuais usam 1 mensagem por ciclo.
- Gera `reservation_id`.
- Gera `reservation_token`.
- Armazena `reservation_token_hash`.
- Define `status = reserved`.
- Incrementa `attempt_count`.
- Define expiracao de reserva em 120 segundos.

### ACK

`POST /api/extension/messages/:id/ack`:

Aceita:

- `processing`
- `sent`
- `failed`

Validacoes:

- Evento pertence a mesma empresa do dispositivo.
- `device_id` bate com dispositivo autenticado.
- `reservation_id` bate.
- `reservation_token` bate com hash salvo.
- Se status ja for `sent` ou `failed`, retorna sucesso idempotente.

Resultado:

- `processing`: marca processamento iniciado.
- `sent`: grava `sent_at`, limpa erro, registra log.
- `failed`: se retryable e ainda ha tentativas, marca `retry`; senao `failed`.

### Heartbeat

`POST /api/extension/status/heartbeat` atualiza:

- `status` do dispositivo.
- `connected_phone`.
- `extension_version`.
- `browser_name`.
- `user_agent`.
- `last_seen_at`.
- `last_connected_at`.
- `last_disconnected_at`.

Status WhatsApp aceitos:

- `connected`
- `disconnected`
- `loading`
- `qr_required`
- `error`
- `sending`
- `syncing`

### Primary sender

Somente um dispositivo por empresa pode ser emissor principal.

Garantido por:

- Indice unico parcial `whatsapp_devices_one_primary_per_company_idx`.
- Funcao `set_primary_whatsapp_device`.
- Bloqueio em `/api/extension/messages/pending`.

### Prevencao de duplicidade

Backend:

- Reserva por `device_id`.
- `reservation_id`.
- `reservation_token_hash`.
- `idempotency_key`.
- ACK idempotente para `sent`/`failed`.
- Expiracao de reserva.

Bots:

- Uma mensagem por ciclo.
- Lock local por `currentMessageId`.
- Timeout de 60 segundos.
- `lastProcessedMessageId`.
- Backoff em erro.
- Delay aleatorio antes do envio.

### Tratamento de erros

Erros tratados:

- Token invalido.
- Signing secret invalido.
- HMAC invalido.
- Device revogado.
- Empresa inativa.
- Device nao-primary.
- WhatsApp desconectado/QR.
- Payload incompleto.
- Telefone invalido.
- API interna WhatsApp indisponivel.
- ACK falhou.
- Resposta HTML onde deveria ser JSON.

---

## 14. Desktop Bot Electron

Pasta:

```text
desktop-bot/
```

Objetivo:

- Cliente desktop Windows separado da extensao Chrome.
- Autentica no SaaS via QWEP.
- Abre WhatsApp Web em janela Electron persistente.
- Busca `message_events.pending`.
- Envia mensagens via WhatsApp Web.
- Envia ACK ao SaaS.

### Arquitetura

```text
desktop-bot/
  main.js                  Processo principal Electron, janelas, tray, timers, IPC
  preload.js               Ponte segura contextBridge -> renderer
  renderer/
    index.html             UI
    app.js                 Renderizacao e handlers de UI
    styles.css             Design visual
  lib/
    qwep-client.js         Cliente HTTP/HMAC QWEP
    crypto.js              Headers e assinatura QWEP
    storage.js             Estado local e credenciais
    logger.js              Logs sanitizados
    message-queue.js       Heartbeat, polling, locks, ACK
    whatsapp-bridge.js     Janela WhatsApp e envio interno
```

### Interface

Tela atual:

- Sidebar com status.
- Configuracao de URL, token, signing secret, polling e delay.
- Mostrar/Ocultar credenciais digitadas.
- Copiar valores digitados.
- Testar conexao.
- Salvar.
- Limpar credenciais.
- Iniciar/Pausar Bot.
- Abrir WhatsApp.
- Resetar estado.
- Widgets de heartbeat, polling, ultimo envio, processadas, fila local e telefone.
- Timeline de logs locais.

### Configuracao

Campos:

- URL do SaaS.
- Token do dispositivo.
- Signing Secret.
- Polling entre 20 e 30 segundos.
- Delay entre 5000 e 10000 ms.
- Iniciar junto com Windows.

### Armazenamento

Arquivo local:

```text
queue-saas-bot-state.json
```

Local:

- Diretorio `userData` do Electron.

Protecao:

- Usa `safeStorage` quando disponivel.
- Fallback `plain_fallback` quando criptografia local nao esta disponivel.
- Logs sanitizam tokens e telefones.

### System Tray

Menu:

- Abrir painel.
- Abrir WhatsApp Web.
- Iniciar/Pausar bot.
- Sair.

Ao fechar a janela principal, o app fica na bandeja.

### Inicializacao com Windows

Usa:

```js
app.setLoginItemSettings()
```

Controlado pelo checkbox "Iniciar junto com o Windows".

### Fluxo operacional

1. Usuario salva URL/token/signing secret.
2. Clica em testar conexao.
3. Bot chama `/api/extension/auth/validate`.
4. Usuario abre WhatsApp Web e escaneia QR se necessario.
5. Usuario inicia bot.
6. Timers iniciam heartbeat e polling.
7. Polling busca 1 mensagem.
8. Bot marca `processing`.
9. Bot aguarda delay aleatorio.
10. Bot envia via API interna do WhatsApp Web.
11. Bot envia ACK `sent` ou `failed`.

### Envio WhatsApp

O app nao navega para:

```text
web.whatsapp.com/send?phone=...
```

Ele tenta usar a camada interna do WhatsApp Web:

- `webpackChunkwhatsapp_web_client`
- `WAWebCollections`
- `WAWebWidFactory`
- `WAWebSendMsgChatAction`
- `sendTextMsgToChat`
- `addAndSendMsgToChat`

Se a API interna estiver indisponivel:

- Cancela envio sem navegar.
- Registra falha.
- Backend decide `retry`/`failed`.

### Build `.exe`

Script:

```powershell
cd desktop-bot
npm run dist
```

Saida:

```text
desktop-bot/dist/Queue SaaS Bot Setup.exe
```

### Limitacoes

- Depende de APIs internas do WhatsApp Web.
- `sent` significa chamada de envio aceita pela camada interna, nao confirmacao de entrega pelo WhatsApp.
- Nao ha envio de midia.
- Nao ha failover automatico entre varios dispositivos.
- O telefone conectado nem sempre pode ser extraido com confiabilidade.

---

## 15. Extensao Chrome

Pasta:

```text
extension/
```

Manifest:

- Manifest V3.
- Nome: `Queue SaaS WhatsApp Connector`.
- Permissoes: `alarms`, `scripting`, `storage`, `tabs`.
- Host permissions: `https://web.whatsapp.com/*`, localhost/127.0.0.1.
- Permissoes opcionais para `https://*/*`.

### Finalidade

- Cliente QWEP alternativo ao Desktop Bot.
- Configura URL, token e signing secret.
- Autentica no SaaS.
- Envia heartbeat.
- Faz polling automatico via `chrome.alarms`.
- Processa uma mensagem por ciclo.
- Envia ACK.

### Componentes

```text
extension/src/background/service-worker.js
extension/src/lib/qwep-client.js
extension/src/lib/message-queue.js
extension/src/lib/whatsapp-bridge.js
extension/src/lib/storage.js
extension/src/lib/logger.js
extension/src/lib/crypto.js
extension/src/popup/*
extension/src/options/*
```

### Diferencas para o Desktop Bot

| Tema | Extensao Chrome | Desktop Bot Electron |
|---|---|---|
| Ambiente | Chrome do operador | App Windows proprio |
| Janela WhatsApp | Aba existente no Chrome | Janela Electron persistente |
| Credenciais | `chrome.storage.local` | `safeStorage` quando possivel |
| Timers | `chrome.alarms` | `setInterval` no main process |
| Instalacao | `chrome://extensions` Load unpacked | Instalador `.exe` |
| Tray | Nao | Sim |
| Auto start Windows | Nao confirmado | Sim |

### Estado atual

- Existe e possui envio automatico.
- Ainda inclui botao manual "Processar proxima mensagem" como fallback.
- O README indica que o envio nao navega para `/send`.
- Assim como o Desktop Bot, depende de APIs internas do WhatsApp Web.

---

## 16. Fluxo Completo do Sistema

### 1. Cadastro do cliente

Funcionario/admin acessa `/operation` ou API `/api/queue`.

Preenche:

- Nome.
- Telefone.
- Quantidade de pessoas.

### 2. Criacao da fila

`createQueueEntryForCurrentProfile()`:

- Valida payload.
- Normaliza telefone.
- Insere `queue_entries`.
- Banco gera `ticket_code`, `position`, `public_customer_token`.

### 3. Geracao do link

`buildCustomerQueueLink(public_customer_token)` monta:

```text
{NEXT_PUBLIC_APP_URL}/queue/customer/{token}
```

### 4. Renderizacao do template

NotificationProvider chama:

```ts
renderNotificationMessage("queue_created", context)
```

Busca template ativo por empresa ou fallback.

### 5. Criacao do `message_event`

Se `notification_channel = whatsapp_extension`:

- `provider = whatsapp_extension`
- `status = pending`
- `type = queue_created`
- `payload.message` contem texto renderizado
- `payload.recipient_phone` contem telefone normalizado
- `idempotency_key` e gerada

Se canal simulado:

- `provider = none`
- `status = simulated`

### 6. Consumo pelo Desktop Bot

Bot autenticado:

- Heartbeat ativo.
- WhatsApp conectado.
- Primary sender.
- Polling chama `/api/extension/messages/pending?limit=1`.

Backend:

- Reserva mensagem.
- Retorna `reservation_id` e `reservation_token`.

### 7. Envio pelo WhatsApp

Bot:

- Marca `processing`.
- Aguarda delay aleatorio.
- Chama API interna do WhatsApp Web.
- Nao navega para `/send`.

### 8. ACK

Bot chama:

```text
POST /api/extension/messages/:id/ack
```

Com:

- `status = sent` ou `failed`.
- `reservation_id`.
- `reservation_token`.
- `provider_response`.

### 9. Atualizacao do status

Backend:

- Se sucesso: `message_events.status = sent`.
- Se falha recuperavel: `retry`.
- Se falha final: `failed`.

### 10. Chamada/liberacao do cliente

Funcionario clica "Chamar".

Sistema:

- Atualiza `queue_entries.status = released`.
- Grava `released_at`.
- Cria mensagem `customer_released` com template ativo.
- Display publico exibe overlay.
- Link individual mostra "Voce foi chamado".

### 11. Expiracao do link

Depois de:

```text
released_at + released_link_expiration_minutes
```

RPC publica retorna dados minimos.

Pagina mostra:

```text
Este atendimento expirou.
Procure um atendente caso precise de ajuda.
```

---

## 17. Seguranca

### Tokens e secrets

Dispositivo:

- Token puro exibido apenas uma vez.
- Banco salva `token_hash`.
- Signing secret exibido apenas uma vez.
- Banco salva `signing_secret_hash` e `signing_secret_encrypted`.
- Criptografia AES-256-GCM com chave derivada de `QWEP_SECRET_ENCRYPTION_KEY` ou service role.

Desktop:

- Usa `safeStorage` quando disponivel.
- Nao envia credenciais para WhatsApp Web.
- Logs removem padroes `qwep_live_` e `qwep_sig_`.

Extensao:

- Usa `chrome.storage.local`.
- Nao envia token/signing secret ao contexto do WhatsApp.

### RLS e isolamento

- RLS habilitado nas tabelas sensiveis.
- Tenant isolado por `company_id`.
- Plataforma isolada por `platform_profiles`.
- APIs QWEP derivam `company_id` do token do dispositivo; cliente nao informa `company_id` como autoridade.

### Mascaramento

- Telefone publico por RPC: `mask_customer_phone`.
- Frontend: `maskBrazilianPhone`.
- Logs desktop: `maskPhone`.
- Logs de dispositivos nao devem conter token, secret ou payload sensivel bruto.

### Middleware/proxy

`src/proxy.ts`:

- Protege rotas privadas.
- Permite caminhos publicos:
  - `/api/extension`
  - `/login`
  - `/auth`
  - `/display`
  - `/forbidden`
  - `/queue/customer`
- Redireciona usuarios nao autenticados para `/login`.
- Redireciona usuario autenticado em `/login` para `/auth/redirect`.

### Rate limit

Implementado em memoria:

- Auth validate: 10/min por IP + token hash.
- QWEP operacional: 60/min por token hash e chave de endpoint.

Limitacao:

- Em deploy com multiplas instancias/serverless, o rate limit em memoria nao e global.

### Replay protection

- Nonces ficam em memoria por 5 minutos.
- Impede replay dentro da mesma instancia.
- Para producao distribuida, precisa storage compartilhado.

---

## 18. Scripts e Execucao

### SaaS

Instalar:

```powershell
cd C:\Users\User\queue-saas
npm install
```

Rodar dev:

```powershell
npm run dev
```

Build:

```powershell
npm run build
```

Lint:

```powershell
npm run lint
```

Start producao local:

```powershell
npm run start
```

Variaveis:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
QWEP_SECRET_ENCRYPTION_KEY=opcional
```

### Desktop Bot

Instalar:

```powershell
cd C:\Users\User\queue-saas\desktop-bot
npm install
```

Rodar:

```powershell
npm run start
```

Lint/sintaxe:

```powershell
npm run lint
```

Gerar instalador:

```powershell
npm run dist
```

Saida:

```text
desktop-bot/dist/Queue SaaS Bot Setup.exe
```

### Extensao Chrome

1. Abrir `chrome://extensions`.
2. Ativar Developer Mode.
3. Clicar em Load unpacked.
4. Selecionar `C:\Users\User\queue-saas\extension`.
5. Configurar URL, token e signing secret nas opcoes da extensao.

### Migracoes

Executar manualmente no Supabase SQL Editor:

```text
database/001_create_companies.sql
...
database/024_update_public_customer_link_expiration.sql
```

Script utilitario opcional:

```text
database/999_cleanup_operational_test_data.sql
```

Esse script apaga apenas:

- `message_events`
- `queue_entries`
- `whatsapp_device_logs`

Preserva:

- Empresas.
- Usuarios.
- Configuracoes.
- Templates.
- Dispositivos.
- Estrutura do banco.

---

## 19. Funcionalidades Implementadas

- [x] Login geral com Supabase Auth.
- [x] Signup inicial e onboarding de empresa.
- [x] Redirecionamento pos-login por contexto.
- [x] Multi-tenancy por `company_id`.
- [x] Plataforma SaaS separada por `platform_profiles`.
- [x] Roles tenant `admin` e `employee`.
- [x] Roles plataforma `owner`, `admin`, `support`.
- [x] Dashboard tenant realtime.
- [x] Painel operacional com cards.
- [x] Cadastro de cliente com nome, telefone e quantidade de pessoas.
- [x] Normalizacao de telefone brasileiro.
- [x] Geracao automatica de ticket/senha.
- [x] Posicionamento automatico da fila.
- [x] Reordenacao da fila apos alteracoes.
- [x] Liberar/chamar cliente.
- [x] Concluir atendimento.
- [x] Cancelar atendimento.
- [x] Cancelamento publico pelo cliente enquanto `waiting`.
- [x] Link individual publico por token.
- [x] Telefone mascarado em pagina publica.
- [x] Expiracao real do link apos `released_at`.
- [x] Ocultacao de dados sensiveis apos expirar/cancelar/concluir.
- [x] Display publico por slug.
- [x] Display publico com tema claro/escuro.
- [x] Modo TV e fullscreen.
- [x] Overlay animado para cliente liberado.
- [x] Templates editaveis por empresa.
- [x] Variaveis de template.
- [x] Renderizacao de template ao criar `message_events`.
- [x] NotificationProvider configuravel.
- [x] Noop/simulated provider.
- [x] Provider para WhatsApp Extension com eventos pending.
- [x] `message_events` com reserva, ACK, retry e idempotencia.
- [x] Backend QWEP v1.
- [x] Token por dispositivo com hash.
- [x] Signing secret com hash e criptografia.
- [x] HMAC em endpoints operacionais.
- [x] Heartbeat QWEP.
- [x] Polling QWEP.
- [x] ACK QWEP.
- [x] Primary sender.
- [x] Logs de dispositivo.
- [x] Painel admin de WhatsApp devices em configuracoes.
- [x] Revogacao de dispositivo.
- [x] Definicao de dispositivo principal.
- [x] Extensao Chrome Manifest V3.
- [x] Desktop Bot Electron.
- [x] System tray no Desktop Bot.
- [x] Auto start Windows no Desktop Bot.
- [x] Build `.exe` com electron-builder.
- [x] Netlify configurado com plugin Next.js.
- [x] RLS nas tabelas principais.
- [x] RPCs publicas limitadas.
- [x] Documentacoes especificas existentes.

---

## 20. Funcionalidades Pendentes

- [ ] Evolution API real.
- [ ] API Oficial WhatsApp.
- [ ] SMS provider real.
- [ ] Upload de logo/banner da empresa no Supabase Storage.
- [ ] Som no display publico.
- [ ] Failover automatico de primary sender.
- [ ] Rotacao periodica de token/signing secret.
- [ ] Rate limit distribuido.
- [ ] Replay nonce distribuido.
- [ ] Observabilidade centralizada.
- [ ] Logs globais completos na plataforma.
- [ ] Historico completo de envios por empresa na UI.
- [ ] Dashboard de saude dos dispositivos WhatsApp.
- [ ] Testes automatizados de Server Actions.
- [ ] Testes automatizados dos Route Handlers QWEP.
- [ ] Testes E2E do fluxo fila -> mensagem -> ACK.
- [ ] CI/CD formal.
- [ ] Politica de backup e restore documentada.
- [ ] Controle de prioridade na fila. A confirmar se sera requisito.
- [ ] Registro de ultimo acesso real de usuarios tenant.
- [ ] Hardening de CSP e headers de seguranca em producao.
- [ ] Auditoria de LGPD/privacidade.

---

## 21. Problemas Conhecidos

1. WhatsApp Web automation e instavel por natureza.
   - O Desktop Bot e a extensao dependem de APIs internas do WhatsApp Web.
   - Mudancas no WhatsApp podem quebrar envio.

2. ACK `sent` nao equivale a entrega final.
   - O sistema confirma que o WhatsApp Web aceitou a chamada interna de envio.
   - Confirmacao de entrega ao destinatario nao foi identificada no codigo atual.

3. Rate limit em memoria.
   - Funciona em uma instancia.
   - Nao e distribuido em ambiente serverless/multiplas instancias.

4. Nonce/replay em memoria.
   - Protege dentro da instancia atual.
   - Nao evita replay entre instancias diferentes.

5. `reserve_pending_message_events` existe em SQL, mas a rota atual implementa reserva via queries no Next.js.
   - Nao e necessariamente erro, mas e ponto de manutencao para evitar divergencia.

6. Evolution API e SMS ainda caem em Noop.
   - Os canais existem na configuracao, mas nao ha provider real.

7. Sem suite automatizada abrangente.
   - Foram encontrados scripts de lint/build, mas nao testes automatizados formais.

8. Deploy publico precisa confirmar que `/api/extension/*` responde JSON.
   - O proxy ja deixa `/api/extension` como publico.
   - A confirmar no ambiente publicado atual.

9. `processedCount` e local ao Desktop Bot.
   - Conta processamento local, nao metrica global.

10. `phone connected` pode aparecer vazio.
    - A extracao do telefone conectado no WhatsApp Web nao e confiavel no MVP.

11. Dados reais do Supabase nao foram consultados nesta documentacao.
    - Estado de migrations aplicadas em producao: A confirmar.

---

## 22. Roadmap Recomendado

### Fase 1 - Consolidar beta

- Confirmar migrations aplicadas no Supabase real.
- Rodar teste manual completo do fluxo:
  - cadastro;
  - template;
  - message_event pending;
  - Desktop Bot;
  - envio WhatsApp;
  - ACK sent;
  - liberacao;
  - expiracao.
- Criar checklist operacional de suporte.

### Fase 2 - Testes e confiabilidade

- Adicionar testes unitarios para:
  - telefone;
  - template rendering;
  - QWEP signature;
  - payloads de notificacao.
- Adicionar testes de Route Handlers QWEP.
- Adicionar E2E com modo simulado sem WhatsApp real.
- Criar smoke tests para deploy Netlify.

### Fase 3 - Seguranca producao

- Trocar rate limit em memoria por Redis/Upstash ou tabela dedicada.
- Persistir nonce/replay em storage compartilhado.
- Adicionar rotacao de tokens.
- Adicionar auditoria de revogacao/credenciais.
- Rever headers/CSP de producao.

### Fase 4 - Observabilidade

- Dashboard de dispositivos.
- Historico de envios por tenant.
- Alertas para device offline.
- Alertas para muitos `retry`/`failed`.
- Logs globais para plataforma.

### Fase 5 - Providers robustos

- Implementar Evolution API.
- Avaliar API Oficial WhatsApp.
- Manter Desktop Bot como alternativa local, nao unica solucao de producao.

### Fase 6 - Produto comercial

- Storage para logos/banners.
- Configuracoes visuais do display.
- Som no display.
- Relatorios por periodo.
- SLA operacional por dispositivo.
- Pagina de status interna.

---

## 23. Conclusao

O Queue SaaS esta em um estado avancado de MVP/beta tecnico. O sistema web tem arquitetura multi-tenant consistente, banco com RLS, rotas protegidas, paginas publicas limitadas por RPC, templates por empresa, notificacoes desacopladas e backend QWEP completo para automacao WhatsApp.

O Desktop Bot Electron e a extensao Chrome tornam o projeto capaz de consumir eventos `message_events.pending` e tentar envio por WhatsApp Web com HMAC, reserva, ACK e protecao contra duplicidade. Ainda assim, a automacao por WhatsApp Web deve ser tratada como componente sensivel e instavel, porque depende de APIs internas fora do controle do projeto.

Nivel de maturidade recomendado:

- SaaS de fila: **beta proximo de producao controlada**.
- QWEP backend: **beta funcional com hardening pendente**.
- Desktop Bot/Extensao: **MVP operacional em validacao**.
- WhatsApp em producao robusta: **recomendada evolucao para Evolution API ou API Oficial**.

Antes de operar em ambiente real com volume, recomenda-se validar o deploy, aplicar todas as migrations, adicionar testes automatizados, substituir rate limit/replay em memoria por mecanismo distribuido e definir estrategia oficial de mensageria.
