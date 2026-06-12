# Notification Flow

## Objetivo

Preparar o fluxo de notificacao por WhatsApp sem integrar a Evolution API agora.

## Provider atual

O fluxo novo usa:

```text
src/lib/notifications/notification-provider.ts
src/lib/notifications/noop-notification-provider.ts
```

`NoopNotificationProvider` nao envia mensagem real. Ele registra evento em
`message_events` com:

- `provider = none`
- `status = simulated`
- `type = queue_created` ou `customer_released`

## Evento ao cadastrar cliente

Payload:

```json
{
  "type": "queue_created",
  "customer_name": "Cliente",
  "customer_phone": "(15) 99999-1234",
  "ticket_code": "Q20260610-ABC123",
  "party_size": 2,
  "customer_link": "https://app.com/queue/customer/token",
  "company_name": "Empresa"
}
```

## Evento ao liberar cliente

Payload:

```json
{
  "type": "customer_released",
  "customer_name": "Cliente",
  "customer_phone": "(15) 99999-1234",
  "ticket_code": "Q20260610-ABC123",
  "party_size": 2,
  "customer_link": "https://app.com/queue/customer/token",
  "company_name": "Empresa",
  "released_at": "2026-06-10T18:00:00.000Z"
}
```

## Evolucao para Evolution API

Criar um provider real mantendo a mesma interface:

```text
EvolutionApiNotificationProvider implements NotificationProvider
```

Regras:

- Tokens ficam apenas no servidor.
- O frontend nunca recebe token da Evolution API.
- O provider registra `sent` ou `failed` em `message_events`.
- A regra de negocio da fila nao deve mudar.
