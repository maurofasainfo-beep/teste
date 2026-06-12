# Segurança da Extensao

## Principios

- Token e signing secret nunca sao enviados para o WhatsApp Web.
- Token e signing secret nao sao exibidos no popup.
- Logs locais mascaram telefone e removem valores com prefixo `qwep_live_` ou `qwep_sig_`.
- A extensao nao usa `innerHTML` para dados externos.
- A extensao nao carrega content script automaticamente no WhatsApp Web.
- A extensao nao usa `<all_urls>`.
- A extensao nao envia dados para observabilidade externa.

## Armazenamento

As credenciais ficam em `chrome.storage.local`, que e adequado para MVP, mas ainda depende da seguranca do perfil local do navegador.

Para producao, considerar:

- Rotacao periodica de token.
- Revogacao rapida pelo painel admin.
- Sessao curta por dispositivo.
- Auditoria de IP/user-agent.
- Protecao do perfil do Chrome usado em operacao.

## HMAC

Polling, ACK e heartbeat usam HMAC SHA-256. A extensao assina:

```text
METHOD + "\n" + pathname + "\n" + timestamp + "\n" + nonce + "\n" + sha256(body)
```

O backend valida timestamp, nonce, hash do body e assinatura.

## Dados sensiveis

Evitar registrar:

- token;
- signing secret;
- telefone completo;
- corpo completo de mensagens;
- links individuais completos.

O MVP processa telefone e mensagem somente pelo tempo necessario para envio e ACK.

## Riscos conhecidos

- Automacao por WhatsApp Web pode quebrar se o DOM mudar.
- O processamento automatico nao navega para URL de conversa. Telefone e mensagem sao enviados apenas para o script executado no contexto da aba do WhatsApp Web, sem token ou signing secret.
- Conta WhatsApp pode sofrer limitacao se houver volume agressivo.
- `chrome.storage.local` nao substitui cofre corporativo.
- Dispositivo comprometido deve ser revogado imediatamente no painel do SaaS.
