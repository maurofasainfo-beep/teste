# Auditoria visual e responsiva - FasaWait

## 1. Resumo executivo da auditoria visual

Foi feita auditoria visual das abas FasaWait abertas no Google Chrome e dos componentes que sustentam as telas principais do sistema. As abas abertas mostravam a tela de operacao (`/operation`) e o display publico (`/display/cafepastelsoares`).

O principal problema encontrado era que a interface funcionava bem em desktop, mas varias telas internas ainda dependiam de composicoes largas: sidebar fixa no desktop, cards altos, tabela de usuarios com acoes inline, botoes pequenos para toque e paineis secundarios ocupando espaco no mobile. A correcao aplicada foi incremental: manter a arquitetura e as regras de negocio, melhorar breakpoints, reduzir decoracao, aumentar alvos de toque e criar alternativas mobile para conteudo tabular.

Nenhuma regra de negocio, migration, policy RLS ou configuracao Supabase foi alterada.

## 2. Lista de telas analisadas

- Abas abertas no Chrome:
  - Operacao: `/operation`
  - Display publico: `/display/cafepastelsoares`
- Telas auditadas por codigo/componentes:
  - Dashboard tenant
  - Operacao da fila
  - Cadastro de cliente
  - Listas de fila e liberados
  - Empresa
  - Usuarios
  - Templates
  - Configuracoes
  - WhatsApp/dispositivos
  - Aparencia da pagina publica
  - Plataforma: dashboard, empresas, detalhe da empresa e usuarios
  - Pagina publica do cliente
  - Login

## 3. Problemas visuais encontrados por tela

### Operacao

- Sidebar desktop ocupa muito espaco, mas o shell mobile ja existia.
- Cards de metricas e colunas tinham altura minima grande demais para telas pequenas.
- Formulario, lista de espera e lista de liberados competiam por largura.
- Acoes do card da fila ficavam compactas demais para toque.
- Ticket longo e links podiam comprimir o conteudo principal.

### Display publico

- Cabecalho e nome da empresa estavam grandes demais em larguras menores.
- Colunas lado a lado precisavam empilhar melhor no mobile/tablet.
- Codigo da senha podia ocupar largura excessiva.
- Estados vazios ocupavam altura exagerada em telas pequenas.

### Dashboard

- Lista de atividade recente usava linha horizontal com status no fim, comprimindo nomes em mobile.
- Cards metricos tinham padding e tipografia altos para telas pequenas.

### Usuarios

- Tabela com selects e botao de salvar nao era adequada para celular.
- Acoes inline exigiam rolagem horizontal ou toque preciso.
- Icone de criar usuario tambem aparecia em salvar, criando incoerencia visual.

### Templates

- Cards tinham hover/decoracao acima do necessario.
- Botao editar nao ocupava largura confortavel no mobile.
- Drawer funcionava, mas poderia ter padding melhor em telas pequenas.

### Configuracoes

- Menu lateral de secoes era informativo, nao acionavel, e ocupava espaco demais no mobile/tablet.
- URL publica e formulario de fila precisavam empilhar melhor.
- Painel WhatsApp tinha acoes compactas em cards de dispositivos.
- Logs podiam quebrar mal com textos longos.

### Empresa e plataforma

- Cards e formularios usavam colunas largas cedo demais.
- Lista de empresas escondia status/CNPJ no mobile sem alternativa visivel.
- Detalhe de empresa e reset de senha precisavam de acoes full-width em telas pequenas.

### Pagina publica do cliente

- O card tinha arredondamento/decoracao acima do necessario.
- Badge de status podia cortar no mobile.
- Botao de sair usava formato pill, menos consistente com o restante do design.
- Posicao usava ordinal nao ASCII; foi trocado para forma estavel `1o`.

## 4. Elementos considerados inuteis ou redundantes

- Menu lateral de secoes em Configuracoes: mantido apenas no desktop largo, pois nao executa acao.
- Hover com deslocamento em cards: restringido com `motion-safe` para reduzir ruido.
- Alturas vazias grandes em filas/display: reduzidas em mobile.
- Comentario de botao de cadastro no login com setter nao usado: removido funcionalmente ao eliminar o setter inutilizado.

## 5. Melhorias aplicadas

- Botoes, inputs e selects passaram para altura base de 44px.
- Cards metricos ficaram mais compactos no mobile.
- Header de pagina ganhou melhor comportamento de acao e descricao.
- Operacao:
  - layout passa para uma coluna no celular;
  - tablet/notebook pequeno usa espaco com mais eficiencia;
  - listas de fila podem ficar lado a lado no desktop;
  - acoes dos cards ficam full-width em mobile.
- Usuarios:
  - tabela mantida no desktop;
  - cards responsivos adicionados em mobile/tablet pequeno.
- Configuracoes:
  - menu lateral escondido abaixo de `xl`;
  - formularios e botoes ajustados para toque;
  - WhatsApp/dispositivos com acoes em grade responsiva.
- Display publico:
  - titulo e chamadas responsivas;
  - colunas empilhadas corretamente;
  - codigo da senha com quebra e largura controlada.
- Pagina publica do cliente:
  - card limitado a 340px no celular e 430px em telas maiores;
  - badge empilha no mobile;
  - botoes e modal de saida ajustados.
- Global:
  - `body` com `overflow-x: hidden` para evitar vazamento horizontal da pagina.

## 6. Arquivos alterados

- `src/app/(app)/companies/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(platform)/platform/companies/[id]/page.tsx`
- `src/app/(platform)/platform/companies/page.tsx`
- `src/app/(platform)/platform/users/page.tsx`
- `src/app/globals.css`
- `src/components/auth/login-form.tsx`
- `src/components/customer-queue/customer-link-actions.tsx`
- `src/components/customer-queue/customer-status-card.tsx`
- `src/components/customer-queue/leave-queue-dialog.tsx`
- `src/components/dashboard/live-dashboard.tsx`
- `src/components/display/public-display-board.tsx`
- `src/components/layout/page-header.tsx`
- `src/components/queue/operational-board.tsx`
- `src/components/settings/public-page-branding-panel.tsx`
- `src/components/settings/whatsapp-devices-panel.tsx`
- `src/components/templates/template-workspace.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/metric-card.tsx`
- `src/components/ui/select.tsx`
- `src/components/users/users-workspace.tsx`

Observacao: `desktop-bot/renderer/index.html` ja estava modificado antes desta tarefa e nao foi alterado nesta auditoria.

## 7. Antes/depois conceitual das principais mudancas

- Antes: usuarios em tabela unica. Depois: cards no mobile e tabela no desktop.
- Antes: operacao dependia de colunas grandes. Depois: fluxo mobile em coluna unica, com acoes largas e listas compactas.
- Antes: configuracoes exibia uma navegacao lateral sem acao em telas pequenas. Depois: conteudo util aparece primeiro.
- Antes: display usava escala de TV mesmo em viewport pequeno. Depois: texto, senha e estados se adaptam.
- Antes: pagina publica do cliente era mais decorativa e podia comprimir status. Depois: card mais contido, sem overflow horizontal e com acoes claras.

## 8. Como validar em celular, tablet e desktop

Servidor local ativo:

```text
http://localhost:3000
```

Validar manualmente no Chrome/DevTools:

1. Abrir `http://localhost:3000/display/cafepastelsoares`.
2. Abrir um link publico de cliente existente.
3. Testar larguras:
   - 390px
   - 768px
   - 1024px
   - 1440px
4. Em uma sessao autenticada, validar:
   - `/dashboard`
   - `/operation`
   - `/companies`
   - `/users`
   - `/templates`
   - `/settings`
   - `/platform/dashboard`
   - `/platform/companies`
   - `/platform/users`
5. Conferir:
   - menu mobile;
   - formularios;
   - botoes principais;
   - drawer/modal;
   - cards;
   - listas/tabelas;
   - estados vazios;
   - textos longos;
   - ausencia de rolagem horizontal.

Validacao executada nesta revisao:

- `npm.cmd run lint`: aprovado.
- `npm.cmd run build`: aprovado.
- `git diff --check`: aprovado, apenas avisos CRLF do Git no Windows.
- Chrome DevTools Protocol em 390, 768, 1024 e 1440 px para:
  - display publico;
  - pagina publica do cliente;
  - login.
- Resultado CDP: `scrollWidth <= innerWidth` e `runtimeErrors = 0` nos breakpoints testados.

## 9. Riscos restantes

- As telas autenticadas nao puderam ser validadas localmente com screenshot pos-codigo porque o servidor local redireciona para `/login` sem sessao.
- A validacao visual das telas internas dependeu das abas abertas no Chrome, da leitura dos componentes e de build/lint.
- Nao foi feito teste com grande volume de clientes, nomes muito longos ou muitos dispositivos/logs.
- A alteracao global de altura de inputs/botoes aumenta levemente a densidade vertical, mas melhora toque e acessibilidade.
- `desktop-bot/renderer/index.html` permanece com alteracao preexistente fora do escopo.

## 10. Sugestoes futuras

- Adicionar testes visuais com Playwright autenticado usando estado de sessao controlado.
- Criar fixtures locais para dashboard/operacao/usuarios sem depender de Supabase remoto.
- Padronizar componentes `ListCard` e `ResponsiveTable` para evitar recriar cards mobile por tela.
- Adicionar casos de teste com nomes longos, muitos clientes e muitos logs.
- Criar checklist de QA mobile para cada release.
