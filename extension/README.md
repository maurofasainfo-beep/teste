# Queue SaaS WhatsApp Connector

Extensao Chrome Manifest V3 para consumir eventos QWEP v1 do SaaS de filas e enviar mensagens pelo WhatsApp Web.

## O que esta incluido

- Configuracao de URL do SaaS, token do dispositivo e signing secret.
- Validacao em `POST /api/extension/auth/validate`.
- Heartbeat em `POST /api/extension/status/heartbeat`.
- Polling automatico de uma mensagem por ciclo em `GET /api/extension/messages/pending`.
- ACK em `POST /api/extension/messages/:id/ack`.
- Envio MVP pelo WhatsApp Web sem recarregar a aba quando o dispositivo esta autenticado, primary e conectado.

## Como instalar no Chrome

1. Abra `chrome://extensions`.
2. Ative `Developer mode`.
3. Clique em `Load unpacked`.
4. Selecione a pasta `extension`.
5. Abra os detalhes da extensao e confirme que ela tem permissao para `https://web.whatsapp.com/*`.

## Como configurar

1. No SaaS, acesse `Configuracoes > WhatsApp`.
2. Crie um dispositivo.
3. Copie o token e o signing secret exibidos uma unica vez.
4. Abra as opcoes da extensao.
5. Informe:
   - URL do SaaS, exemplo `http://localhost:3000`.
   - Token do dispositivo.
   - Signing Secret.
6. Clique em `Salvar e testar`.

## Como usar

1. Abra o popup da extensao.
2. Clique em `Abrir WhatsApp Web`.
3. Faça login no WhatsApp Web, se necessario.
4. Confirme no popup que o status do WhatsApp esta `connected`.
5. No SaaS, selecione o canal `Extensao WhatsApp`.
6. Cadastre um cliente na fila.
7. Aguarde o polling automatico.
8. A extensao buscara um unico evento por ciclo, enviara uma unica mensagem e confirmara o ACK.

## Reset de estado

O botao `Resetar estado da extensao` limpa alarms, locks, fila local e ultimo erro sem apagar credenciais. Depois do reset, clique em `Testar conexao` para religar heartbeat e polling automatico.

## Compatibilidade QWEP

As rotas operacionais usam:

```text
Authorization: Bearer {token}
X-QWEP-Version: 1
X-QWEP-Timestamp: {unix_ms}
X-QWEP-Nonce: {nonce}
X-QWEP-Body-SHA256: {sha256_body}
X-QWEP-Signature: {hmac_sha256}
```

A string canonica assinada e:

```text
METHOD
/pathname
timestamp
nonce
body_sha256
```

## Limitacoes do MVP

- O envio depende da interface atual do WhatsApp Web.
- O ACK `sent` significa que o WhatsApp Web aceitou a chamada interna de envio, nao que o WhatsApp confirmou entrega ao destinatario.
- O envio nao navega para URL de conversa. Se a API interna do WhatsApp Web estiver indisponivel, a extensao cancela o envio e registra falha/retry.
- O telefone conectado nao e extraido com confiabilidade nesta versao.
- O service worker MV3 usa `chrome.alarms` para heartbeat e polling automatico controlado. O polling processa no maximo uma mensagem por ciclo.
- Para producao robusta, Evolution API ou API Oficial WhatsApp continuam sendo alternativas mais estaveis.
