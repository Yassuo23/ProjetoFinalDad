# ADR 0005 — Persistência MySQL/MariaDB

- **Status:** aceito
- **Data:** 2026-11-25
- **Decisores:** equipe do projeto

## Contexto

O app precisa conectar-se ao banco MySQL/MariaDB do usuário, configurável por endereço IP,
porta e credenciais. SQLite é um arquivo local e não oferece esses parâmetros.

## Decisão

Usar MySQL/MariaDB por meio de `mysql2/promise`, com conexão criada somente no processo principal
do Electron. As variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `DB_SSL`
são lidas do `.env`; a senha não é exposta ao renderer.

As migrações rodam de forma assíncrona na inicialização. DDL do MySQL pode causar commit
implícito, portanto as migrações devem ser idempotentes. O `.env` permanece fora do controle de
versão, e `.env.example` documenta os campos sem credenciais reais.

## Consequências

- O MySQL/MariaDB precisa estar acessível no host e porta configurados antes de abrir o app.
- O schema local SQLite anterior não é convertido automaticamente; dados existentes precisam
  ser migrados separadamente.
- `DB_SSL=true` exige certificado TLS válido.
- O app não deve ser distribuído com credenciais compartilhadas de produção embutidas. Use um
  usuário MySQL com permissões mínimas necessárias.
