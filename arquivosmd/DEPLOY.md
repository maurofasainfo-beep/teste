# Deploy

## Vercel

1. Suba o repositório para GitHub.
2. Acesse `https://vercel.com`.
3. Clique em `Add New > Project`.
4. Selecione o repositório.
5. Configure as variáveis:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://sua-url.vercel.app
```

6. Clique em `Deploy`.

## Supabase Auth

Depois do deploy:

1. Volte no Supabase.
2. Acesse `Authentication > URL Configuration`.
3. Atualize `Site URL` para a URL de produção.
4. Adicione redirects permitidos, se necessário.

## Segurança de produção

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Use HTTPS.
- Revise Security Advisor e Performance Advisor no Supabase.
- Monitore logs de Route Handlers e Server Actions.
