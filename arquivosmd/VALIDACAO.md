# Validação

## Comandos executados

```bash
npm run lint
npm run build
```

Resultado:

- Lint concluído com sucesso.
- Build concluído com sucesso.
- Servidor local iniciado em `http://127.0.0.1:3000`.
- `/login` respondeu HTTP 200 via `Invoke-WebRequest`.
- Camada `/platform` validada por build com rotas:
  - `/platform/dashboard`
  - `/platform/companies`
  - `/platform/companies/new`
  - `/platform/companies/[id]`
  - `/platform/users`

Observação: o Browser integrado da sessão não estava disponível, então a verificação visual foi substituída por validação HTTP local.

## Teste manual recomendado

1. Configure `.env.local`.
2. Execute os SQLs `001` a `008`.
3. Rode:

```bash
npm run dev
```

4. Abra `/login`.
5. Crie acesso inicial.
6. Configure empresa em `/onboarding`.
7. Cadastre usuário employee em `/users`.
8. Cadastre cliente em `/operation`.
9. Abra `/display/{slug}`.
10. Libere cliente e confirme popup/pulse.

## Critérios

- Usuário employee não acessa `/settings`, `/users`, `/templates` ou `/companies`.
- Empresa A não enxerga dados da empresa B.
- Display público não exige login.
- Telefone do cliente não é retornado pela RPC pública.
- Eventos de mensagem são registrados sem envio real.
