# Supabase Setup

## PASSO 1 - Criar conta Supabase

1. Acesse `https://supabase.com`.
2. Clique em `Start your project`.
3. Entre com GitHub, Google ou e-mail.

## PASSO 2 - Criar projeto

1. No dashboard, clique em `New project`.
2. Escolha a organizacao.
3. Informe o nome do projeto.
4. Crie uma senha forte para o banco.

## PASSO 3 - Configurar regiao

1. Em `Region`, escolha a regiao mais proxima dos usuarios.
2. Para Brasil, use a menor latencia disponivel no painel.
3. Clique em `Create new project`.

## PASSO 4 - Obter chaves

1. No projeto, clique em `Connect`.
2. Copie `Project URL`.
3. Copie a chave publica: `Anon key` ou `Publishable key`.
4. Para operacoes server-side, acesse `Project Settings > API Keys`.
5. Copie `Service Role Key` ou `Secret key`.

Use no `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## PASSO 5 - Executar SQLs na ordem correta

1. No menu lateral, clique em `SQL Editor`.
2. Clique em `New query`.
3. Abra `database/001_create_companies.sql`.
4. Copie o conteudo completo.
5. Cole no SQL Editor.
6. Clique em `Run`.
7. Repita para `002` ate `012`.

## PASSO 6 - Configurar Auth

1. Clique em `Authentication`.
2. Clique em `Providers`.
3. Ative `Email`.
4. Em `Authentication > URL Configuration`, configure:
   - `Site URL`: `http://localhost:3000` em desenvolvimento.
   - Em producao, use a URL do deploy.

## PASSO 7 - Configurar Providers

1. Em `Authentication > Providers`, mantenha `Email` ativo.
2. Google/GitHub podem ser ativados depois.
3. Para cada provider social, configure callback URL conforme indicado pelo Supabase.

## PASSO 8 - Configurar Realtime

1. Clique em `Database`.
2. Clique em `Replication`.
3. Confirme que `queue_entries` esta na publicacao `supabase_realtime`.
4. A migracao `008` tenta habilitar automaticamente.

## PASSO 9 - Configurar Storage

1. Clique em `Storage`.
2. Nenhum bucket e obrigatorio nesta etapa.
3. Quando houver logos/anexos, crie buckets privados por empresa.

## PASSO 10 - Criar primeiro owner da plataforma

Depois de executar as migracoes ate `012`:

1. No Supabase, clique em `Authentication`.
2. Clique em `Users`.
3. Clique em `Add user`.
4. Informe e-mail e senha do usuario da sua empresa SaaS.
5. Marque o e-mail como confirmado, se o painel oferecer essa opcao.
6. Copie o `User UID` criado.
7. Abra `SQL Editor`.
8. Execute:

```sql
insert into public.platform_profiles (
  user_id,
  name,
  email,
  role,
  status
) values (
  'COLE_AQUI_O_USER_UID',
  'Nome do Owner',
  'owner@suaempresa.com',
  'owner',
  'active'
);
```

## PASSO 11 - Testar plataforma

1. Rode `npm run dev`.
2. Acesse `http://localhost:3000/login`.
3. Entre com o e-mail e senha do owner.
4. Confirme redirecionamento para `/platform/dashboard`.
5. Acesse `/platform/companies/new`.
6. Crie uma empresa cliente com admin inicial.
7. Saia.
8. Entre com o admin do cliente.
9. Confirme redirecionamento para `/dashboard`.

## PASSO 12 - Testar fila do cliente

1. Acesse `/operation`.
2. Cadastre um cliente.
3. Abra `/display/{slug}` em outra aba.
4. Libere o cliente e confira a atualizacao em tempo real.
