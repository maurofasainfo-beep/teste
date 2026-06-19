# SECURITY_MODEL.md

## Modelo de seguranca QWEP

## Token

- Gerado no servidor.
- Exibido uma unica vez.
- Salvo apenas como hash.
- Nunca registrado em logs.
- Revogavel por dispositivo.

## Signing secret

- Gerado no servidor.
- Exibido uma unica vez.
- Salvo como hash e versao criptografada.
- Usado para validar HMAC.

## Multi-tenant

A extensao nunca envia `company_id` como autoridade.

O backend deriva a empresa por:

```text
Bearer token -> token_hash -> whatsapp_devices.company_id
```

## HMAC

Cada request operacional usa:

- timestamp;
- nonce;
- body hash;
- assinatura HMAC.

Isso reduz replay e spoofing de ACK.

## Logs

Permitido:

- status;
- device id;
- evento;
- mensagens operacionais curtas.

Proibido:

- token puro;
- signing secret;
- telefone completo desnecessario;
- corpo bruto de mensagem;
- link individual completo em logs operacionais.

## Rate limit

Existe rate limit simples em memoria para auth, polling, ACK e heartbeat.

Pendencia para producao:

- rate limit distribuido em Redis, Upstash ou tabela dedicada.

