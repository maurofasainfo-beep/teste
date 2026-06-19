# WHATSAPP_DEVICE_SETUP.md

## Objetivo

Explicar como criar e testar um dispositivo WhatsApp Web para o FasaWait Bot ou para a extensao.

## Criar dispositivo

1. Acesse o FasaWait como admin da empresa.
2. Abra `Configuracoes`.
3. Va ate a secao `WhatsApp`.
4. Informe o nome do dispositivo.
5. Clique em `Criar dispositivo`.
6. Copie imediatamente:
   - Token
   - Signing secret

Essas credenciais aparecem apenas uma vez.

## Definir emissor principal

Apenas o emissor principal pode reservar mensagens.

No painel:

1. Localize o dispositivo.
2. Clique em `Definir primary`.

## Revogar dispositivo

1. Localize o dispositivo.
2. Clique em `Revogar`.
3. O token deixa de autenticar.
4. Reservas abertas sao liberadas para retry.

## Teste via API

Use Postman, Insomnia ou cURL.

1. Crie dispositivo.
2. Valide token em `/api/extension/auth/validate`.
3. Configure canal `Extensao WhatsApp`.
4. Cadastre cliente na fila.
5. Confirme `message_events.pending`.
6. Chame `/api/extension/messages/pending` com assinatura QWEP.
7. Envie ACK `sent`.
8. Verifique `message_events.sent`.

## Assinatura QWEP

Canonical string:

```text
METHOD
PATHNAME
TIMESTAMP
NONCE
BODY_SHA256
```

Header:

```text
Authorization: Bearer {token}
X-QWEP-Version: 1
X-QWEP-Timestamp: {unix_ms}
X-QWEP-Nonce: {random}
X-QWEP-Body-SHA256: {sha256_body}
X-QWEP-Signature: {hmac_sha256}
```
