# WHATSAPP_EXTENSION_BACKEND.md

## Objetivo

Esta etapa implementa a infraestrutura backend para uma futura extensao WhatsApp Web usando o protocolo QWEP v1.

Ainda nao existe extensao Chrome e ainda nao existe envio real por WhatsApp.

## O que foi criado

- `whatsapp_devices`
- `whatsapp_device_logs`
- campos QWEP em `message_events`
- `notification_channel` em `company_settings`
- APIs `/api/extension/*`
- provider futuro `ExtensionWhatsAppProvider`
- painel admin basico em `Configuracoes > WhatsApp`

## APIs

### `POST /api/extension/auth/validate`

Valida o token do dispositivo, ativa dispositivos `pending_activation`, atualiza `last_seen_at` e retorna configuracao basica.

### `GET /api/extension/messages/pending`

Exige Bearer token e assinatura QWEP. Apenas o `is_primary_sender` recebe mensagens. O backend reserva lote de `message_events` com provider `whatsapp_extension`.

### `POST /api/extension/messages/:id/ack`

Confirma `sent` ou `failed`, valida reserva, aplica idempotencia e registra log.

### `POST /api/extension/status/heartbeat`

Atualiza status do dispositivo, telefone conectado, versao e ultimo heartbeat.

## HMAC

O HMAC e real nesta etapa. O servidor armazena:

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
- sem extensao real;
- sem envio de midia;
- sem failover automatico;
- sem worker dedicado.

