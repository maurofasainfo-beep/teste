# Queue SaaS Bot Desktop

App desktop Windows em Electron para consumir eventos QWEP v1 do Queue SaaS e enviar mensagens pelo WhatsApp Web.

Este app e separado da extensao Chrome. Ele nao altera o SaaS, o banco Supabase, as APIs QWEP nem a extensao existente.

## Requisitos

- Node.js 20 ou superior.
- SaaS Queue rodando localmente ou publicado.
- Um dispositivo WhatsApp criado no painel `Configuracoes > WhatsApp`.
- Token do dispositivo e Signing Secret copiados no momento de criacao do dispositivo.
- Dispositivo marcado como emissor principal.

## Instalar dependencias

```bash
cd desktop-bot
npm install
```

## Rodar em desenvolvimento

```bash
npm run start
```

O app abre o painel do bot. Use `Abrir WhatsApp` para carregar `https://web.whatsapp.com` dentro do Electron e escanear o QR Code.

## Configurar credenciais

1. Abra o painel do app.
2. Informe a URL do SaaS.
   - Desenvolvimento: `http://localhost:3000`
   - Producao: URL publicada do SaaS
3. Informe o token do dispositivo.
4. Informe o Signing Secret.
5. Ajuste o polling entre 20 e 30 segundos, se necessario.
6. Clique em `Salvar`.
7. Clique em `Testar conexao`.

As credenciais ficam no diretorio de dados do usuario do Electron. No Windows, o app usa `safeStorage` quando disponivel para proteger token e signing secret. O app nunca envia credenciais para a janela do WhatsApp Web.

## Usar o bot

1. Clique em `Abrir WhatsApp`.
2. Aguarde o WhatsApp Web carregar.
3. Confirme que o status esta `connected`.
4. Clique em `Iniciar bot`.

Com o bot ativo:

- heartbeat e enviado automaticamente;
- polling busca no maximo 1 mensagem por ciclo;
- cada envio usa lock local persistente;
- existe delay aleatorio entre 5 e 10 segundos antes do envio;
- falhas geram ACK `failed` para o backend decidir retry;
- ACK `sent` atualiza o `message_event` como enviado.

## Inicializar com Windows

Marque `Iniciar junto com o Windows` e salve. O app usa `app.setLoginItemSettings` do Electron.

## Bandeja do sistema

Ao fechar o painel, o app continua rodando na bandeja.

Menu da bandeja:

- Abrir painel
- Abrir WhatsApp Web
- Iniciar/Pausar bot
- Sair

## Gerar instalador .exe

```bash
cd desktop-bot
npm run dist
```

O instalador sera gerado em:

```text
desktop-bot/dist/Queue SaaS Bot Setup.exe
```

## Teste com o SaaS

1. Rode o SaaS.
2. Entre como admin da empresa.
3. Acesse `Configuracoes > WhatsApp`.
4. Crie um dispositivo e copie token + Signing Secret.
5. Marque o dispositivo como emissor principal.
6. Rode este app com `npm run start`.
7. Configure URL, token e Signing Secret.
8. Clique em `Testar conexao`.
9. Clique em `Abrir WhatsApp` e escaneie o QR Code.
10. Clique em `Iniciar bot`.
11. No SaaS, selecione o canal `Extensao WhatsApp`, se aplicavel.
12. Cadastre um cliente na fila.
13. Confirme que foi criado um `message_event` com `provider = whatsapp_extension` e `status = pending`.
14. Aguarde um ciclo de polling.
15. Confirme que a mensagem foi enviada no WhatsApp.
16. Confirme que o `message_event` mudou para `sent`.

## Seguranca

- `nodeIntegration` fica desativado nas janelas.
- `contextIsolation` fica ativado.
- Token e Signing Secret nao sao expostos na UI depois de salvos.
- Token e Signing Secret nao sao enviados ao WhatsApp Web.
- Logs locais mascaram telefone e removem padroes de token/secret.
- O envio nao usa navegacao para URL de conversa.
- O app nao altera banco nem chama Supabase diretamente.

## Limitacoes do MVP

- O envio ainda depende de APIs internas do WhatsApp Web, que podem mudar.
- Se a API interna estiver indisponivel, o app nao navega para conversa automaticamente; ele marca falha para retry pelo backend.
- O WhatsApp pode limitar ou bloquear automacoes dependendo do volume e comportamento.
- Para operacao mais robusta em producao, Evolution API ou API Oficial WhatsApp continuam sendo alternativas recomendadas.
