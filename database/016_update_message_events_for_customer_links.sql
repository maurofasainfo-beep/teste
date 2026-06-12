-- # Objetivo
-- Permitir eventos simulados ou ignorados no fluxo de notificacao futura.
--
-- # Explicacao
-- Como ainda nao existe envio real por WhatsApp/Evolution API, os eventos de
-- notificacao devem registrar que foram simulados ou ignorados. A tabela atual
-- message_events e mantida para preservar a arquitetura existente e evitar uma
-- segunda tabela com a mesma responsabilidade.
--
-- # SQL completo
alter type public.message_event_status add value if not exists 'simulated';
alter type public.message_event_status add value if not exists 'skipped';

comment on type public.message_event_status is
  'Status dos eventos de mensageria/notificacao: simulated e skipped indicam fluxo preparado sem envio real.';

-- # Como executar no SQL Editor do Supabase
-- Copiar este arquivo completo, colar no SQL Editor e executar apos a migration 015.
--
-- # Resultado esperado
-- message_events passa a aceitar status simulated e skipped para o fluxo sem
-- WhatsApp integrado.
