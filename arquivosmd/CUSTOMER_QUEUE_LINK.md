# Customer Queue Link

## Objetivo

Cada cliente cadastrado na fila recebe um link individual:

```text
/queue/customer/{token}
```

Esse link nao exige login e mostra apenas os dados daquele cliente.

## Como funciona

1. Funcionario cadastra nome, telefone e quantidade de pessoas.
2. `queue_entries` recebe `party_size` e `public_customer_token`.
3. A aplicacao monta o link com `NEXT_PUBLIC_APP_URL`.
4. O painel operacional mostra a senha, o link individual e os botoes Copiar link e Abrir link.
5. O FasaWait Bot ou a extensao WhatsApp pode enviar esse link quando o canal WhatsApp esta ativo.

## Seguranca

- A pagina publica nao usa `select` direto em `queue_entries`.
- A leitura acontece pela RPC `get_public_customer_queue_entry(customer_token)`.
- A RPC retorna um unico registro por token.
- Telefone completo nunca e retornado para a pagina publica.
- A saida da fila usa `cancel_public_customer_queue_entry(customer_token)`.
- O cancelamento publico so funciona quando `status = waiting`.

## Estados da pagina

`waiting`: mostra dados do cliente, posicao, senha, quantidade de pessoas e botao Sair da fila.

`released`: mostra aviso forte "Voce foi chamado", remove o botao de sair e mostra tempo restante.

`expired`: calculado pela interface com base em `released_at + released_link_expiration_minutes`.

`cancelled`: mostra "Voce saiu da fila".

`completed`: mostra "Atendimento finalizado".

## Expiracao

O sistema nao cria status fisico `expired`. A expiracao e derivada para evitar
estado duplicado:

```text
released_at + released_link_expiration_minutes
```

O valor padrao e 5 minutos e pode ser alterado por admin em:

```text
Configuracoes > Fila
```
