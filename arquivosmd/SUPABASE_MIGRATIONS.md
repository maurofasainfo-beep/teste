# Supabase Migrations

## Ordem de execucao

Execute as novas migrations nesta ordem, depois da `012`:

1. `database/013_add_party_size_to_queue_entries.sql`
2. `database/014_add_public_customer_token_to_queue_entries.sql`
3. `database/015_add_queue_link_expiration_settings.sql`
4. `database/016_update_message_events_for_customer_links.sql`
5. `database/017_update_public_customer_queue_link_rls.sql`

## Como executar no Supabase

1. Acesse o projeto no Supabase.
2. Clique em `SQL Editor`.
3. Clique em `New query`.
4. Abra o arquivo SQL local.
5. Copie todo o conteudo.
6. Cole no editor.
7. Clique em `Run`.
8. Repita para o proximo arquivo.

## O que cada migration faz

`013`: adiciona `party_size` em `queue_entries`.

`014`: adiciona `public_customer_token` e `cancelled_by_customer`.

`015`: cria `company_settings` e a configuracao de expiracao.

`016`: adiciona status `simulated` e `skipped` em `message_event_status`.

`017`: cria RPCs publicas seguras, mascara telefone, atualiza broadcast e protege
`company_settings` com RLS.

## Teste rapido no SQL Editor

Depois de executar as migrations, valide:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'queue_entries'
  and column_name in ('party_size', 'public_customer_token', 'cancelled_by_customer');
```

```sql
select proname
from pg_proc
where proname in (
  'get_public_customer_queue_entry',
  'cancel_public_customer_queue_entry',
  'mask_customer_phone'
);
```

## Migrações QWEP

Execute as migrations abaixo depois da `017`:

1. `database/018_create_whatsapp_devices.sql`
2. `database/019_create_whatsapp_device_logs.sql`
3. `database/020_update_message_events_for_qwep.sql`
4. `database/021_create_whatsapp_device_functions.sql`
5. `database/022_create_whatsapp_device_rls_policies.sql`
6. `database/023_create_whatsapp_indexes.sql`

Ordem obrigatoria:

1. Criar dispositivos.
2. Criar logs.
3. Atualizar `message_events`.
4. Criar funcoes de primary, revogacao e reserva.
5. Aplicar RLS.
6. Criar indices.

As APIs da extensao so devem ser testadas depois de executar todas as migrations QWEP.
