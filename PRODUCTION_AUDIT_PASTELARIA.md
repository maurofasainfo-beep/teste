# Auditoria Critica de Producao - FasaWait para Pastelaria de Alto Volume

Data da auditoria: 2026-07-02

Escopo analisado: `PROJECT_FULL_DOCUMENTATION.md`, `src/`, `database/`, `desktop-bot/`, `extension/`, `package.json`, `.env.example`, `next.config.ts` e `netlify.toml`.

## 1. Resumo Executivo

O FasaWait tem uma base funcional para piloto: multiempresa por `company_id`, RLS nas tabelas sensiveis, links publicos por token forte, display por RPC publica, outbox de mensagens em `message_events`, HMAC QWEP, reserva de mensagens e ACK com token de reserva.

Antes desta auditoria havia riscos importantes para uso em uma pastelaria grande: a API autenticada de status podia reliberar ou alterar entradas ja finalizadas por chamada direta; a API autenticada de fila nao bloqueava explicitamente empresa inativa; a rota de pending QWEP reimplementava reserva no TypeScript apesar de ja existir RPC atomica no banco; e a geracao aleatoria de `ticket_code` podia falhar em caso raro de colisao durante cadastro.

Esses pontos foram corrigidos no codigo/migration. Mesmo assim, eu nao recomendo tratar o sistema como "producao critica sem contingencia" ainda. O maior risco remanescente e operacional: envio via WhatsApp Web depende de APIs internas e instaveis, nao ha teste de carga automatizado, nao ha observabilidade externa/alertas e as migrations precisam ser conferidas no Supabase real antes do cliente abrir a fila.

## 2. Veredito

**Pronto para piloto controlado.**

Condicao: usar com operador acompanhando a fila, plano manual de contingencia, Supabase/migrations conferidos, bot testado no local e WhatsApp tratado como canal auxiliar. Para uma pastelaria grande em pico, eu nao colocaria o WhatsApp Web como unico mecanismo de chamada.

## 3. Problemas Encontrados

### Critico

- Nenhum risco critico comprovado por analise estatica apos as correcoes aplicadas. Isso nao significa garantia absoluta: nao houve teste de carga real, teste com Supabase remoto, nem teste ao vivo do WhatsApp Web.

### Alto

- **API de status sem maquina de estados efetiva.**  
  Evidencia: `src/app/api/queue/[id]/status/route.ts` atualizava qualquer entrada da empresa para `released`, `completed` ou `cancelled`, sem filtrar status atual.  
  Impacto: dois operadores ou uma chamada direta poderiam reliberar cliente, gerar mensagem duplicada, reabrir timestamps ou alterar entrada ja concluida/cancelada.  
  Status: corrigido.

- **API autenticada de fila nao bloqueava explicitamente empresa inativa.**  
  Evidencia: `src/app/api/queue/route.ts` e `src/app/api/queue/[id]/status/route.ts` usavam `getSessionContext()` sem a mesma checagem de `requireProfile()`.  
  Impacto: perfil ativo em empresa inativa poderia tentar operar pela API direta.  
  Status: corrigido.

- **Reserva QWEP na rota nao usava a RPC atomica existente.**  
  Evidencia: `src/app/api/extension/messages/pending/route.ts` fazia select/update em TypeScript, enquanto `database/021_create_whatsapp_device_functions.sql` ja tinha `reserve_pending_message_events()` com `FOR UPDATE SKIP LOCKED`.  
  Impacto: maior janela de corrida e mais round trips sob polling/retry.  
  Status: corrigido.

- **WhatsApp Web depende de API interna.**  
  Evidencia: `desktop-bot/lib/whatsapp-bridge.js` e `extension/src/lib/whatsapp-bridge.js` procuram modulos internos do WhatsApp Web.  
  Impacto: uma mudanca do WhatsApp pode parar envios em horario de pico.  
  Status: risco restante; corrigir exige provider oficial/gateway suportado, nao uma mudanca pequena.

### Medio

- **Colisao rara de `ticket_code` podia derrubar cadastro.**  
  Evidencia: `set_queue_entry_defaults()` gerava sufixo aleatorio de 6 hex e dependia apenas da unique constraint.  
  Impacto: em volume alto, uma colisao rara faria o insert falhar.  
  Status: corrigido por migration nova com retry.

- **Replay protection e rate limit QWEP sao em memoria.**  
  Evidencia: `src/lib/qwep/replay.ts` e `src/lib/qwep/rate-limit.ts` usam `Map`.  
  Impacto: em serverless com multiplas instancias, limite e nonce nao sao globais. O risco e reduzido por HMAC, token forte, reserva e ACK, mas nao e ideal.  
  Status: pendente; recomendado Redis/KV ou tabela PostgreSQL de nonce/buckets.

- **Criacao de empresa/usuario nao e transacional entre Auth Admin e banco.**  
  Evidencia: `src/app/actions.ts` e `src/lib/platform/actions.ts` fazem etapas separadas.  
  Impacto: falha intermediaria pode deixar usuario sem profile ou empresa sem admin.  
  Status: pendente; requer compensacao/rotina de reparo.

- **Falha de notificacao nao aparece claramente para operador.**  
  Evidencia: Providers retornam status, mas fluxo operacional segue sem alerta visual forte.  
  Impacto: cliente pode nao receber WhatsApp e operador nao perceber.  
  Status: pendente.

- **Sem observabilidade externa.**  
  Evidencia: ha logs locais e `whatsapp_device_logs`, mas nao ha alertas/tracing/metricas.  
  Impacto: suporte demora para identificar bot parado, mensagens presas ou Supabase instavel.  
  Status: pendente.

- **Sem politica automatizada de retencao.**  
  Evidencia: `queue_entries`, `message_events` e logs crescem indefinidamente; existe apenas script manual `999_cleanup_operational_test_data.sql`.  
  Impacto: dados antigos podem degradar performance e expor historico desnecessario.  
  Status: pendente.

### Baixo

- Display publico mostra nomes completos por slug publico. Pode ser aceitavel para chamada de fila, mas deve ser aprovado pelo cliente.
- Extensao guarda credenciais em `chrome.storage.local`; adequado para piloto, fraco para ambiente compartilhado.
- `.env.example` nao inclui `QWEP_SECRET_ENCRYPTION_KEY`, apesar do codigo suportar a variavel.
- Nao ha suite automatizada de testes de concorrencia, RLS, QWEP e fluxo publico.

## 4. Correcoes Aplicadas

Arquivos alterados:

- `src/app/api/queue/route.ts`
  - Bloqueia API quando perfil ou empresa esta inativo.

- `src/app/api/queue/[id]/status/route.ts`
  - Valida UUID do parametro.
  - Bloqueia perfil/empresa inativa.
  - `released` agora so atualiza entrada ainda `waiting`.
  - `completed` e `cancelled` so atualizam `waiting` ou `released`.
  - Concorrencia ou status ja alterado retorna `409`.
  - Mensagem de chamada so e criada se a transicao realmente ocorreu.

- `src/app/api/extension/messages/pending/route.ts`
  - Remove reserva manual em TypeScript.
  - Usa `reserve_pending_message_events()` no banco, com `FOR UPDATE SKIP LOCKED`.

- `extension/src/lib/qwep-client.js`
  - Rejeita resposta nao JSON/HTML de fallback nas chamadas QWEP, alinhando com o Desktop Bot.

- `database/028_harden_queue_ticket_generation.sql`
  - Recria `set_queue_entry_defaults()` mantendo o formato `QYYYYMMDD-XXXXXX`.
  - Tenta ate 20 codigos antes de falhar, evitando colisao aleatoria comum.

## 5. Migrations Criadas

- `database/028_harden_queue_ticket_generation.sql`

Nao foi aplicada em banco remoto. Deve ser copiada e executada no Supabase SQL Editor depois da migration `027_add_public_page_branding.sql`.

## 6. Riscos Restantes

### Operacao

- Operador ainda precisa de procedimento manual para fila quando internet, Supabase ou bot falhar.
- Nao ha confirmacao visual forte de "WhatsApp enviado" no fluxo principal.
- Multiplos operadores precisam ser treinados para nao usar concluir como atalho errado.

### Banco

- Migrations aplicadas no Supabase real nao foram verificadas nesta auditoria.
- Nao ha teste automatizado de concorrencia com 2 a 5 operadores.
- Nao ha limpeza/arquivamento automatico de dados antigos.

### WhatsApp

- Envio depende de WhatsApp Web interno e pode quebrar sem aviso.
- Credenciais locais da extensao ficam no perfil Chrome.
- Bot precisa estar aberto, autenticado, como primary sender e com WhatsApp conectado.

### Seguranca

- Replay/rate limit QWEP ainda sao locais ao processo.
- Slug do display publico mostra nomes completos.
- Service role precisa ficar somente no servidor/Netlify, nunca no cliente.

### Performance

- Nao houve teste de carga com 50 a 300 clientes e varios operadores.
- Realtime e polling precisam ser validados no plano Supabase real.
- `message_events` e logs podem crescer muito sem retencao.

### UX

- Operador pode nao perceber falha de mensageria sem painel de eventos pendentes/falhos.
- Display em TV depende de conexao estavel e refresh visual.

### Suporte

- Falta painel de incidentes: bot offline, mensagens em retry, fila travada, ultima chamada, ultimo ACK.
- Falta runbook operacional dentro do produto.

## 7. Checklist Antes de Instalar no Cliente

- Confirmar que o Supabase real tem migrations `001` a `028` aplicadas na ordem.
- Conferir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_APP_URL`.
- Definir `QWEP_SECRET_ENCRYPTION_KEY` dedicado no ambiente de producao.
- Confirmar dominio HTTPS final e `NEXT_PUBLIC_APP_URL` apontando para ele.
- Criar empresa da pastelaria com slug publico definitivo.
- Configurar templates de entrada e chamada com texto curto e sem ambiguidade.
- Criar dispositivo WhatsApp e marcar um unico primary sender.
- Instalar e autenticar o Desktop Bot no computador da pastelaria.
- Testar display na TV/monitor do cliente.
- Validar link publico em celular real com internet movel.
- Definir processo manual caso WhatsApp/bot/internet falhe.
- Verificar backup/restauracao do Supabase.

## 8. Checklist Para o Dia da Implantacao

- Abrir painel de operacao em pelo menos dois dispositivos.
- Cadastrar 5 clientes reais de teste e validar posicoes.
- Abrir links publicos em celulares diferentes.
- Chamar um cliente e conferir display + link + mensagem.
- Cancelar um cliente pelo operador.
- Cancelar um cliente pelo link publico.
- Concluir um atendimento chamado.
- Desconectar WhatsApp por alguns minutos e validar retries depois da reconexao.
- Reiniciar o Bot e confirmar heartbeat/logs.
- Manter uma lista manual/planilha pronta para contingencia.

Roteiro recomendado de teste:

1. Fluxo basico: cadastrar cliente, abrir link, chamar, confirmar mensagem e concluir.
2. Alta fila: cadastrar 50 clientes, chamar 10, cancelar 5, simular clientes saindo pelo link e conferir posicoes.
3. Multiplos operadores: dois cadastrando, dois chamando, um cancelando enquanto cliente tenta sair pelo link.
4. WhatsApp instavel: desconectar, gerar mensagens, reconectar e validar retry sem duplicidade.
5. Bot reiniciado: reservar mensagem, fechar bot, aguardar expiracao, reabrir e validar retry.
6. Internet instavel: derrubar acesso ao SaaS e confirmar recuperacao.
7. Display publico: abrir display, chamar clientes e validar overlay/atualizacao.
8. Link publico: abrir varios links, validar posicao, cancelar pelo link e conferir expiracao.

## 9. Plano de Contingencia

- WhatsApp cair: continuar chamando pelo display e voz; manter bot desligado ate reconectar; revisar mensagens `retry/failed` depois.
- Bot parar: pausar canal WhatsApp, reiniciar Bot, validar auth e primary sender, conferir logs recentes.
- Internet cair: registrar novos clientes em lista manual com horario; ao voltar, cadastrar na mesma ordem.
- Supabase instavel: parar novos cadastros no sistema e usar lista manual; nao tentar recarregar repetidamente durante incidente.
- Operador errar: cancelar entrada errada e cadastrar novamente; registrar ocorrencia para suporte.
- Fila ficar inconsistente: parar chamadas, exportar/consultar `waiting` por `created_at`, corrigir manualmente via suporte tecnico.
- Display parar: atualizar pagina; se nao voltar, chamar por nome/voz e usar painel operacional como fonte de verdade.

## 10. Testes Executados

- `npm.cmd run lint`  
  Resultado: aprovado.

- `npm.cmd run build`  
  Resultado: aprovado. Next.js 16.2.9 compilou, TypeScript passou e 23 paginas foram geradas.

- `node --check` em todos os arquivos JS de `extension/src`  
  Resultado: aprovado.

- `git diff --check`  
  Resultado: aprovado; apenas avisos de conversao LF/CRLF do Git no Windows.

## 11. Testes Nao Executados

- Nao executei `desktop-bot npm run dist`, porque o Desktop Bot nao foi alterado.
- Nao executei teste no Supabase remoto.
- Nao executei carga com 50/300 clientes.
- Nao executei teste real de WhatsApp Web ao vivo.
- Nao executei teste multioperador com sessoes reais simultaneas.
- Nao apliquei a migration `028` no banco remoto.

## 12. Proximos Passos Recomendados

Urgente antes do cliente:

- Aplicar `database/028_harden_queue_ticket_generation.sql` no Supabase.
- Fazer teste manual completo com 50 clientes antes de abrir a loja.
- Configurar `QWEP_SECRET_ENCRYPTION_KEY`.
- Definir contingencia manual impressa ou planilha local.

Alta prioridade:

- Criar testes automatizados para transicoes de fila, cancelamento publico, chamada simultanea e multiempresa.
- Persistir replay/rate limit QWEP em Redis/KV/Postgres.
- Criar painel de mensagens pendentes/falhas/retry.
- Criar alerta de bot offline e WhatsApp desconectado.

Media prioridade:

- Adicionar retencao/arquivamento de `queue_entries`, `message_events` e `whatsapp_device_logs`.
- Adicionar opcao de mascarar nome no display.
- Criar fluxo de reparo para empresas/usuarios parcialmente criados.
- Avaliar provider oficial/suportado de WhatsApp para producao comercial.
