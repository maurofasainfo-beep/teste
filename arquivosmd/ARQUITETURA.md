# Arquitetura

## Decisoes

O sistema usa Next.js App Router com Server Components por padrao. Componentes interativos, como login, painel operacional e display publico, usam Client Components.

O Supabase e a fronteira principal de backend:

- Auth: identidade dos usuarios.
- PostgreSQL: dados de plataforma, empresas, perfis, filas, templates e eventos.
- RLS: isolamento real entre contextos.
- Realtime: atualizacao do painel operacional e display publico.

## Estrutura

```text
src/app
  (app)                  Rotas autenticadas das empresas clientes
  (platform)             Rotas da administracao da plataforma
  api                    Route Handlers
  auth/redirect          Resolucao pos-login
  display/[slug]         Display publico
  login                  Login geral
  onboarding             Criacao inicial de empresa cliente
src/components
  auth                   Login
  display                Display realtime
  layout                 Shell autenticado dos clientes
  platform               Shell da plataforma
  queue                  Painel operacional
  ui                     Componentes Shadcn locais
src/lib
  auth                   Sessao de cliente e plataforma
  platform               Actions e permissoes da plataforma
  messages               MessageProvider e Noop provider
  supabase               Clientes browser/server/admin
  types                  Tipos do banco
database                 Migracoes SQL
```

## Administracao da Plataforma

A empresa proprietaria do SaaS possui contexto separado das empresas clientes.

```text
auth.users
  platform_profiles      Usuarios da empresa SaaS
    owner
    admin
    support

  profiles               Usuarios das empresas clientes
    admin
    employee
```

`platform_profiles` nao possui `company_id`. Isso impede misturar usuarios da plataforma com usuarios de tenants.

Fluxo de login:

1. Verificar `platform_profiles`.
2. Se existir perfil ativo, redirecionar para `/platform/dashboard`.
3. Caso contrario, verificar `profiles`.
4. Se existir perfil ativo, redirecionar para `/dashboard`.
5. Caso contrario, redirecionar para `/onboarding`.

O painel `/platform` usa `service role` somente no servidor, depois de validar a sessao em `platform_profiles`. Isso torna o acesso administrativo explicito e nao concede acesso automatico pelo browser as tabelas dos tenants.

## Seguranca

- Tokens de service role ficam apenas no servidor.
- `src/lib/supabase/admin.ts` usa `server-only`.
- O frontend usa somente URL e Anon/Publishable Key.
- Server Actions e APIs validam sessao e payload.
- RLS impede vazamento cross-tenant mesmo se uma query for chamada manualmente.
- `platform_profiles` tem RLS proprio.

## Realtime

- Painel operacional: Postgres Changes em `queue_entries`, filtrado por `company_id`.
- Display publico: Broadcast publico por canal `public-display:{slug}` e RPC publica limitada.

Essa escolha evita liberar a tabela `queue_entries` para `anon`, preservando telefones dos clientes.
