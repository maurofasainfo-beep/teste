# Melhorias Operacionais do FasaWait para Pastelaria

## Resumo Executivo

Foram implementadas melhorias para uso real com fila pequena/media em pastelaria: alerta claro de WhatsApp desconectado no Desktop Bot, contagem de mensagens aguardando envio, watchdog local, retomada automatica apos reinicio do computador, rota QWEP de estatisticas sem reserva de mensagens e confirmacao antes de chamar cliente fora da primeira posicao.

O fluxo principal de mensageria continua o mesmo: o bot so reserva mensagem quando o WhatsApp esta conectado; se falhar depois da reserva, envia ACK `failed` com `retryable = true`; o backend devolve o evento para `retry`; e reservas abandonadas expiram no banco.

## Problemas Encontrados

- O Desktop Bot podia mostrar estados pouco claros quando o WhatsApp saia do ar.
- O operador nao tinha um alerta visual forte informando que as mensagens ficariam pendentes.
- Nao havia contador visivel de mensagens `pending/retry/failed` para apoiar suporte rapido.
- O bot dependia do checkbox de auto-start; para operacao real, isso deixava risco de nao voltar apos reinicio do Windows.
- Nao havia watchdog visual para polling/heartbeat parados por falhas repetidas.
- Na operacao da fila, chamar um cliente fora da primeira posicao era facil demais para um clique acidental.

## Correcoes Aplicadas

- Adicionada rota QWEP `GET /api/extension/messages/stats` para contagem de mensagens por status.
- Desktop Bot passa a mostrar alerta claro para:
  - WhatsApp desconectado;
  - QR Code pendente;
  - WhatsApp carregando;
  - erro no WhatsApp;
  - bot sem sincronizacao.
- Desktop Bot passa a consultar estatisticas de mensagens sem reservar/envia-las.
- Bot nao busca mensagem nova quando WhatsApp nao esta conectado.
- Se envio falhar apos reserva, o fluxo existente de ACK retryable continua sendo usado.
- Auto-start do Windows passa a ser ativado automaticamente quando o bot inicia.
- Auto-start fica protegido enquanto o bot esta rodando.
- Ao reabrir depois de reinicio, o bot registra: `Bot reiniciado e pronto para continuar.`
- Adicionado botao `Reiniciar conexao` no Desktop Bot.
- Adicionadas notificacoes nativas para desconexao, QR pendente, reconexao e retomada.
- Na tela de operacao, o primeiro cliente da fila agora fica destacado como `Proximo`.
- Chamar cliente fora da primeira posicao agora exige confirmacao.
- Painel web de WhatsApp mostra mensagens pendentes, em retry e com falha.

## Arquivos Alterados

- `desktop-bot/main.js`
- `desktop-bot/preload.js`
- `desktop-bot/lib/storage.js`
- `desktop-bot/lib/qwep-client.js`
- `desktop-bot/lib/message-queue.js`
- `desktop-bot/lib/whatsapp-bridge.js`
- `desktop-bot/renderer/index.html`
- `desktop-bot/renderer/app.js`
- `desktop-bot/renderer/styles.css`
- `src/app/api/extension/messages/stats/route.ts`
- `src/app/(app)/settings/page.tsx`
- `src/components/settings/whatsapp-devices-panel.tsx`
- `src/components/queue/operational-board.tsx`

## Migration Criada

Nenhuma migration nova foi criada nesta etapa.

A melhoria de observabilidade usa `message_events`, `whatsapp_devices` e `whatsapp_device_logs` ja existentes.

## Melhorias no Desktop Bot

- Status visual mais forte para WhatsApp fora do ar.
- Mensagem operacional: `As mensagens ficarao pendentes e serao enviadas quando reconectar.`
- Contadores locais de mensagens pendentes, em retry, reservadas/processando e com falha.
- Watchdog para heartbeat/polling parados ou falhando repetidamente.
- Botao de reiniciar conexao sem apagar credenciais.
- Notificacao nativa quando WhatsApp desconecta, pede QR Code ou volta.
- Auto-start reforcado para recuperacao depois de reiniciar o computador.
- Logs amigaveis para eventos de recuperacao e alerta.

## Melhorias na Operacao da Fila

- O primeiro cliente da fila e marcado como `Proximo`.
- O botao principal vira `Chamar proximo` para o primeiro cliente.
- Clientes fora da primeira posicao recebem badge `Fora da ordem`.
- Ao chamar fora da ordem, aparece a confirmacao:

```text
Este cliente nao e o primeiro da fila. Deseja chamar mesmo assim?
```

## Como Funciona Agora Quando o WhatsApp Cai

1. O bot detecta que o WhatsApp nao esta conectado.
2. O polling de mensagens e pausado antes de reservar nova mensagem.
3. As mensagens continuam no SaaS como `pending` ou `retry`.
4. O bot mostra alerta forte e contadores de pendencias.
5. Se o WhatsApp cair depois de uma reserva, o bot envia ACK `failed` com `retryable = true`.
6. O backend move a mensagem para `retry`.
7. Quando o WhatsApp reconecta, heartbeat/polling voltam e as mensagens sao enviadas automaticamente.

## Como Funciona Agora Quando o Bot Reinicia

1. Ao iniciar o bot, o auto-start do Windows e ativado.
2. Se o app abrir e o estado anterior era `botRunning = true`, ele chama `startBot({ resumed: true })`.
3. O bot valida credenciais, reinicia heartbeat, polling e watchdog.
4. A interface mostra aviso de retomada por alguns minutos.
5. Se WhatsApp precisar de QR Code, o alerta pede para escanear.

## Validacoes Executadas

- `node --check` nos arquivos JavaScript alterados do Desktop Bot.
- `npm.cmd run lint` na raiz do projeto.
- `npm.cmd run build` na raiz do projeto.
- `npm.cmd run lint` em `desktop-bot`.
- `npm.cmd run dist` em `desktop-bot`.
- `git diff --check`.

## Resultado do Lint

Passou.

Comandos:

```bash
npm run lint
cd desktop-bot
npm run lint
```

## Resultado do Build

Passou.

Comando:

```bash
npm run build
```

A build incluiu a nova rota:

```text
/api/extension/messages/stats
```

## Resultado do Electron Build

Passou.

Comando:

```bash
cd desktop-bot
npm run dist
```

Instalador gerado:

```text
desktop-bot/dist/FasaWait Bot Setup.exe
```

## Riscos Restantes

- WhatsApp Web ainda depende de APIs internas e pode quebrar apos atualizacao do WhatsApp.
- Notificacao nativa depende das permissoes/configuracoes do Windows.
- Auto-start deve ser testado no instalador instalado, nao apenas no build local.
- Nao foi feito teste manual real com WhatsApp conectado/desconectado nesta execucao.
- A contagem de mensagens e consultada por polling/heartbeat; nao e dashboard em realtime.
- Se o SaaS ficar fora do ar, o bot alerta, mas nao consegue confirmar ACK ate a API voltar.

## Como Testar na Pastelaria

1. Instalar `desktop-bot/dist/FasaWait Bot Setup.exe`.
2. Configurar URL, token e signing secret do dispositivo.
3. Iniciar o bot e confirmar que `Iniciar com Windows` ficou ativo.
4. Abrir WhatsApp Web pelo bot e conectar.
5. Criar 3 clientes na fila e validar mensagem de entrada.
6. Desconectar WhatsApp Web.
7. Criar mais clientes e validar alerta vermelho no bot.
8. Confirmar no painel web que mensagens aparecem como pendentes/retry.
9. Reconectar WhatsApp e validar envio automatico.
10. Reiniciar o computador e confirmar que o bot volta sozinho.
11. Criar 5 clientes e tentar chamar o segundo: a confirmacao deve aparecer.
12. Chamar o primeiro cliente: deve seguir direto, sem confirmacao extra.
