# Fluxos

## Login

1. Usuário acessa `/login`.
2. Supabase Auth valida e cria sessão.
3. O Proxy atualiza cookies da sessão.
4. Usuário vai para `/dashboard`.

## Onboarding

1. Usuário cria acesso inicial.
2. Acessa `/onboarding`.
3. O servidor usa Service Role Key para criar `companies` e `profiles`.
4. O usuário vira `admin` da empresa criada.

## Operação da Fila

1. Employee ou admin cadastra cliente.
2. Banco gera `ticket_code` e `position`.
3. `NoopMessageProvider` registra `message_events`.
4. Painel e display recebem atualização realtime.
5. Employee ou admin libera, conclui ou cancela.

## Display Público

1. Cliente abre `/display/{slug}`.
2. Página resolve empresa por RPC pública.
3. Busca apenas entradas `waiting` e `released`.
4. Realtime Broadcast atualiza tela.
5. Ao liberar cliente, aparece popup, destaque e pulse.

## Templates

1. Admin acessa `/templates`.
2. Edita os modelos `queue_created` e `customer_released`.
3. Eventos futuros usarão as variáveis:
   `{{nome_cliente}}`, `{{telefone_cliente}}`, `{{nome_empresa}}`, `{{codigo_senha}}`, `{{link_fila}}`.

## Link Individual do Cliente

1. Funcionario cadastra cliente com nome, telefone e quantidade de pessoas.
2. Banco gera senha, posicao e `public_customer_token`.
3. Sistema mostra link individual em `/queue/customer/{token}`.
4. Sem WhatsApp integrado, o funcionario copia ou abre o link manualmente.
5. Cliente acessa sem login e ve apenas seus proprios dados.
6. Telefone aparece mascarado.
7. Enquanto `status = waiting`, cliente pode sair da fila.
8. Apos liberacao, o botao de sair desaparece.
9. A expiracao e calculada por `released_at + released_link_expiration_minutes`.
