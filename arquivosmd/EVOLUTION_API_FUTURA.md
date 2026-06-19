# Evolution API Futura

## Estado atual

O sistema implementa a interface `MessageProvider`:

```ts
sendQueueCreatedMessage()
sendCustomerReleasedMessage()
```

A implementação atual é `NoopMessageProvider`.

Ela registra eventos em `message_events` com:

- `provider = none`
- `status = recorded`
- `payload` com variáveis renderizáveis

Nenhuma mensagem real é enviada.

## Implementação futura

Criar um novo provider:

```text
src/lib/messages/evolution-api-provider.ts
```

Responsabilidades:

- Ler credenciais apenas no servidor.
- Renderizar template ativo da empresa.
- Chamar endpoint da Evolution API.
- Registrar sucesso ou falha em `message_events`.
- Nunca enviar token para Client Components.

## Variáveis suportadas

- `{{nome_cliente}}`
- `{{telefone_cliente}}`
- `{{nome_empresa}}`
- `{{codigo_senha}}`
- `{{link_fila}}`

## Próxima migração sugerida

Quando a integração real começar:

```text
009_create_company_message_integrations.sql
```

Tabela sugerida:

- `company_id`
- `provider`
- `base_url`
- `instance_name`
- `encrypted_token_reference`
- `active`
- `created_at`
- `updated_at`

Tokens devem ser criptografados ou armazenados fora do banco em secret manager.

## Fluxo novo de notificacao

O fluxo de link individual usa `NotificationProvider`:

```text
src/lib/notifications/notification-provider.ts
src/lib/notifications/noop-notification-provider.ts
```

Enquanto a Evolution API nao estiver integrada, `NoopNotificationProvider`
registra eventos em `message_events` com `status = simulated`.

O payload ja contem:

- `customer_name`
- `customer_phone`
- `ticket_code`
- `party_size`
- `customer_link`
- `company_name`
- `released_at`, quando o tipo for `customer_released`
