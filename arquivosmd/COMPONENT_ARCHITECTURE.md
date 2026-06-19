# Component Architecture

## Layout

- `src/components/layout/product-shell.tsx`
  - Shell compartilhado por tenant e plataforma.
  - Controla sidebar, mobile drawer, item ativo e usuario logado.

- `src/components/layout/app-shell.tsx`
  - Adapta dados de `profiles` e `companies` para o shell tenant.

- `src/components/platform/platform-shell.tsx`
  - Adapta dados de `platform_profiles` para o shell da plataforma.

## UI Primitivos

- `button`, `input`, `select`, `textarea`, `card`, `badge`, `table`.
- Mantidos pequenos, sem regra de negocio.

## UI Compostos

- `MetricCard`
- `StatusBadge`
- `Avatar`
- `EmptyState`
- `Drawer`

## Workspaces

- `LiveDashboard`: dashboard realtime do tenant.
- `OperationalBoard`: cards operacionais da fila.
- `UsersWorkspace`: busca, filtros e gestao visual de usuarios.
- `TemplateWorkspace`: cards e drawer de edicao de templates.

## Regra arquitetural

Componentes visuais podem consumir dados recebidos por props e server actions existentes. Eles nao devem conhecer policies, RLS ou service role.
