# Permissoes

## Platform Owner

Pode:

- Acessar `/platform`.
- Criar empresas clientes.
- Editar empresas clientes.
- Ativar e desativar empresas.
- Criar usuarios da plataforma.
- Gerenciar owners, admins e support.
- Criar admin inicial de clientes.
- Resetar acessos de usuarios clientes.
- Visualizar metricas globais.

## Platform Admin

Pode:

- Acessar `/platform`.
- Criar empresas clientes.
- Editar empresas clientes.
- Ativar e desativar empresas.
- Criar admin inicial de clientes.
- Resetar acessos de usuarios clientes.
- Visualizar metricas globais.

Nao pode:

- Gerenciar owners.
- Criar usuarios owner.
- Alterar usuarios owner.

## Platform Support

Pode:

- Visualizar empresas.
- Visualizar usuarios.
- Visualizar metricas de suporte.

Nao pode:

- Criar empresas.
- Editar empresas.
- Resetar acessos.
- Gerenciar owners.

## Admin da Empresa Cliente

Pode:

- Acessar dashboard.
- Operar fila.
- Gerenciar empresa.
- Gerenciar usuarios.
- Gerenciar configuracoes.
- Gerenciar templates.
- Consultar eventos da propria empresa.

## Employee da Empresa Cliente

Pode:

- Acessar dashboard.
- Operar fila.
- Cadastrar clientes.
- Liberar clientes.
- Concluir atendimentos.
- Cancelar entradas.

Nao pode:

- Gerenciar usuarios.
- Alterar empresa.
- Alterar templates.
- Acessar configuracoes.

## RLS

Nenhuma policy permite acesso por `company_id` diferente do perfil ativo do usuario.

Usuarios `anon` nao recebem acesso direto as tabelas. O display publico usa RPCs limitadas.

`platform_profiles` possui RLS proprio. Usuarios de empresas clientes nao acessam essa tabela.

Usuarios da plataforma nao recebem acesso automatico as tabelas das empresas. O painel `/platform` usa operacoes server-side explicitas apos validar o papel em `platform_profiles`.
