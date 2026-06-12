# MESSAGE_FLOW.md

## Fluxo de mensagens QWEP

```text
Cliente entra na fila
  -> queue_entries
  -> NotificationProvider
  -> message_events.pending
  -> extensao primary busca lote
  -> backend reserva mensagem
  -> extensao envia
  -> extensao confirma ACK
  -> message_events.sent / retry / failed
```

## Status suportados

```text
pending
reserved
processing
sent
failed
retry
cancelled
expired
skipped
simulated
```

## Reserva

O endpoint pending chama `reserve_pending_message_events`.

A mensagem recebe:

- `device_id`
- `reservation_id`
- `reservation_token_hash`
- `reserved_at`
- `reservation_expires_at`

O token de reserva puro e retornado apenas para a extensao.

## ACK

O ACK precisa enviar:

- `status`
- `reservation_id`
- `reservation_token`
- `provider_response`
- `error_message`, se falhar.

## Retry

Falha recuperavel:

```text
status = retry
next_retry_at = agora + delay
```

Falha final:

```text
status = failed
failed_at = now()
```

