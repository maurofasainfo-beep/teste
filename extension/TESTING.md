# Teste Manual da Extensao

## Pre-requisitos

- SaaS rodando em `http://localhost:3000`.
- Migracoes QWEP aplicadas no Supabase.
- Empresa ativa.
- Usuario admin da empresa.
- Canal de notificacao configurado como `Extensao WhatsApp`.
- WhatsApp Web aberto e autenticado.

## Roteiro principal

1. Execute o SaaS local.
2. Acesse `Configuracoes > WhatsApp`.
3. Crie um dispositivo.
4. Copie token e signing secret.
5. Acesse `chrome://extensions`.
6. Ative `Developer mode`.
7. Clique em `Load unpacked`.
8. Selecione a pasta `extension`.
9. Abra as opcoes da extensao.
10. Informe `http://localhost:3000`, token e signing secret.
11. Clique em `Salvar e testar`.
12. Confirme status `authenticated`.
13. Abra o popup e clique em `Abrir WhatsApp Web`.
14. Confirme que o popup mostra WhatsApp `connected`.
15. No SaaS, cadastre cliente na fila.
16. Confirme que foi criado `message_events.pending`.
17. Aguarde o polling automatico ou use o botao manual apenas como fallback.
18. Confirme que a mensagem foi enviada no WhatsApp Web.
19. Confirme que o evento virou `sent`.
20. Confirme que a URL da aba nao mudou para `/send`.

## Testes de falha

### WhatsApp desconectado

1. Saia do WhatsApp Web ou abra a tela de QR Code.
2. Aguarde o polling automatico.
3. Confirme que a extensao nao tenta enviar.
4. Confirme que o heartbeat informa `qr_required` ou `disconnected`.

### Dispositivo nao-primary

1. Crie dois dispositivos.
2. Defina outro como emissor principal.
3. Tente processar com esta extensao.
4. O backend deve negar a consulta automatica com `Dispositivo nao e emissor principal`.

### Dispositivo revogado

1. Revogue o dispositivo no painel.
2. Clique em `Testar conexao`.
3. A extensao deve mostrar erro e parar o fluxo operacional.

### Telefone invalido

1. Gere uma mensagem para telefone invalido.
2. Aguarde o polling automatico ou use o botao manual apenas como fallback.
3. O ACK deve ser `failed`.

## Observacoes

- O envio real depende de uma sessao WhatsApp Web valida.
- O ACK `sent` representa envio aceito pela camada interna disponivel no WhatsApp Web.
- O polling automatico processa no maximo uma mensagem por ciclo e aplica delay antes do envio.
