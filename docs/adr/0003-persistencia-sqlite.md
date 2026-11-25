# ADR 0003 — Persistência SQLite com `node:sqlite`

- **Status:** supersedido por [ADR 0005](./0005-persistencia-mysql.md)
- **Data:** 2026-11-23
- **Decisores:** fundação (AS + ED)

> Decisão histórica. O projeto passou a usar MySQL/MariaDB conforme ADR 0005.

## Contexto

O Zênite precisava de um banco local em `app.getPath('userData')/zenite.db`, nunca dentro de
`dist/`. A primeira opção do roteiro era `better-sqlite3`, um módulo nativo que precisa ser
recompilado para o ABI exato do Node embutido no Electron. Isso adiciona `electron-rebuild` ao
fluxo de 4 devs em Windows e cria uma classe de falha que só aparece no app empacotado:
`NODE_MODULE_VERSION` diferente entre o Node usado no `npm install` e o Node do Electron.

Antes de decidir, medimos o runtime real do app com um script executado pelo próprio Electron:

```
ELECTRON=45.4.1
NODE=24.22.3
SQLITE_MODULO=disponivel
```

Ou seja, o Electron 45.4.1 já traz Node 24.22.3 com o módulo `node:sqlite` embutido. Não há
motivo para pagar o custo de um addon nativo.

## Decisão anterior

Usar `DatabaseSync` de `node:sqlite`, sem dependências externas de banco:

1. `ConexaoBanco` abre o arquivo definido por `ZENITE_DATABASE_PATH` ou, se não definido,
   `userData/zenite.db`, e aplica as PRAGMAs via `db.exec`:
   `journal_mode = WAL`, `foreign_keys = ON` e `busy_timeout = 5000`.
2. `Migrador` registra o que já rodou na tabela `migracoes` e aplica só o pendente. Cada migração
   roda dentro de transação manual (`BEGIN` / `COMMIT`, com `ROLLBACK` no erro).
3. Todo acesso a dados usa `prepare().run/get/all` com parâmetros `?`. Nenhuma concatenação de
   valor do usuário em SQL.
4. O main chama `iniciarBanco()` no `whenReady()` e fecha a conexão no `before-quit`.
5. Os testes usam `ConexaoBanco(':memory:')`, sem arquivo e sem Electron.

## Alternativas descartadas

- **`better-sqlite3` + `@electron/rebuild`** — ABI casado na mão, etapa extra de build e risco de
  falha no empacotamento; resolvido o risco, ainda seria dependência nativa desnecessária.
- **`node:sqlite` com `DatabaseSync` fora de uma classe** — PRAGMAs e transações espalhadas;
  isolamos tudo em `ConexaoBanco` para poder trocar a implementação sem tocar em serviço.
- **Arquivo JSON** — sem transação, sem FK, sem concorrência de leitura; o domínio de Reservas
  precisa de integridade referencial.
- **Banco dentro de `dist/`** — seria apagado a cada build e não sobreviveria a atualização.

## Consequências

- Não há `npm i better-sqlite3`, `@types/better-sqlite3` nem `@electron/rebuild` no projeto.
- `node:sqlite` ainda é marcado como experimental pelo Node; a API está estável o bastante para
  o uso aqui, e o risco fica confinado a `ConexaoBanco`.
- Transações são manuais: esquecer `COMMIT`/`ROLLBACK` deixa a conexão travada. Por isso o
  `Migrador` encapsula o par e tem teste de rollback.
- O `foreign_keys = ON` é obrigatório: o SQLite desliga FK por padrão.
- Revisitar quando o Node do Electron mudar de major ou quando `node:sqlite` deixar de ser
  experimental; a verificação é rodar o script de versões acima e os testes `:memory:`.
