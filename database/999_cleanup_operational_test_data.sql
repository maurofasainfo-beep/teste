-- ATENÇÃO: este script apaga dados operacionais de fila, mensagens e logs,
-- mas preserva empresas, usuários, configurações e dispositivos.
--
-- # Objetivo
-- Limpar dados operacionais de teste para recomeçar os testes de fila e
-- mensageria sem apagar tenants, usuários, templates, configurações ou
-- dispositivos WhatsApp.
--
-- # O que este script apaga
-- - public.message_events: eventos de mensageria, reservas, ACKs e payloads.
-- - public.queue_entries: entradas da fila, senhas, status e links individuais.
-- - public.whatsapp_device_logs: logs operacionais dos dispositivos WhatsApp.
--
-- # O que este script NÃO apaga
-- - public.companies
-- - public.profiles
-- - public.platform_profiles
-- - public.company_settings
-- - public.message_templates
-- - public.whatsapp_devices
-- - usuários do Supabase Auth
-- - estrutura do banco
--
-- # Como executar no SQL Editor do Supabase
-- Copie este arquivo completo, cole no SQL Editor do Supabase e execute
-- somente quando quiser apagar os dados operacionais de teste.
--
-- # SQL
begin;

delete from public.message_events;
delete from public.queue_entries;
delete from public.whatsapp_device_logs;

commit;

-- # Resultado esperado
-- Dados operacionais de fila, eventos de mensagens e logs dos dispositivos
-- removidos. Empresas, usuários, configurações, templates e dispositivos
-- WhatsApp permanecem preservados.
