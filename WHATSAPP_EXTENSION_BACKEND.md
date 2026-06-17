# WHATSAPP_EXTENSION_BACKEND.md

## Objetivo

Esta etapa documenta a infraestrutura backend QWEP v1 usada pelo FasaWait Bot e pela extensao WhatsApp Web.

## O que existe

- `whatsapp_devices`
- `whatsapp_device_logs`
- campos QWEP em `message_events`
- `notification_channel` em `company_settings`
- APIs `/api/extension/*`
- provider `ExtensionWhatsAppProvider`
- painel admin em `Configuracoes > WhatsApp`
- reserva, polling, heartbeat e ACK

## APIs

### `POST /api/extension/auth/validate`

Valida o token do dispositivo, exige signing secret quando o dispositivo possui hash de secret, ativa dispositivos `pending_activation`, atualiza `last_seen_at` e retorna configuracao basica.

### `GET /api/extension/messages/pending`

Exige Bearer token e assinatura QWEP. Apenas o `is_primary_sender` recebe mensagens. O backend reserva lote de `message_events` com provider `whatsapp_extension`.

### `POST /api/extension/messages/:id/ack`

Confirma `processing`, `sent` ou `failed`, valida `company_id`, `device_id`, `reservation_id` e `reservation_token`, aplica idempotencia e registra log.

### `POST /api/extension/status/heartbeat`

Atualiza status do dispositivo, telefone conectado, versao e ultimo heartbeat.

## HMAC

O servidor armazena:

- `token_hash`
- `signing_secret_hash`
- `signing_secret_encrypted`

O segredo HMAC e exibido uma unica vez no painel e criptografado no banco para validacao server-side.

Defina preferencialmente:

```text
QWEP_SECRET_ENCRYPTION_KEY
```

Se ausente, o servidor deriva a chave de criptografia da service role key.

## Limites atuais

- rate limit simples em memoria;
- nonce/replay em memoria;
- sem envio de midia;
- sem failover automatico;
- sem worker dedicado.
