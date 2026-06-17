# FasaWait

SaaS multiempresa para gerenciamento de filas, construido com Next.js, TypeScript, Tailwind, componentes no padrao Shadcn UI e Supabase.

## O que esta incluido

- Autenticacao com Supabase Auth.
- Multi-tenancy por `company_id`.
- RLS completo no PostgreSQL.
- Painel operacional em tempo real.
- Display publico em `/display/{slug}`.
- Templates e eventos de mensagens por empresa.
- QWEP para FasaWait Bot e extensao WhatsApp.
- Desktop Bot Electron com heartbeat, polling e ACK.

## Rodar localmente

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env.local` baseado em `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_ou_publishable_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_ou_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Execute os SQLs da pasta `database` na ordem.

4. Rode o projeto:

```bash
npm run dev
```

## Scripts

```bash
npm run lint
npm run build
npm run dev
```

## Documentacao

- `PROJECT_FULL_DOCUMENTATION.md`
- `ARQUITETURA.md`
- `BANCO_DE_DADOS.md`
- `FLUXOS.md`
- `PERMISSOES.md`
- `SUPABASE_SETUP.md`
- `DEPLOY.md`
- `VALIDACAO.md`
- `WHATSAPP_DEVICE_SETUP.md`

## Link individual

- `CUSTOMER_QUEUE_LINK.md`
- `NOTIFICATION_FLOW.md`
- `SUPABASE_MIGRATIONS.md`
