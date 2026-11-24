# ADR 0019 — Contrato de arquivos, backup e exportação

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS fecha o contrato; ED implementa main/preload; Backend implementa serviço e handler)

## Contexto

O ED pediu uma ponte para diálogos nativos, backup/restauração de `app.getPath('userData')/zenite.db`
e exportação CSV dos agregados do painel. O renderer roda sob `sandbox: true` (R2/R3): não pode
escolher caminho, não pode importar Zod e não pode acessar `node:fs`. A conexão SQLite é criada em
`main/index.ts` e injetada como `DatabaseSync` na composition root; repositórios guardam essa
referência. Trocar o `DatabaseSync` "em voo" durante uma restauração deixaria todos os
repositórios apontando para uma conexão fechada.

## Decisão

1. **Canais:** `arquivos:abrir`, `arquivos:salvar`, `backup:criar`, `backup:restaurar`,
   `exportacao:csv`. Nenhum literal de canal fora de `canais.ts`.
2. **Payloads:** `arquivos:abrir` recebe só `{ titulo?, filtros? }`; `arquivos:salvar` acrescenta
   `nomeSugerido?`. Filtros só oferecem `.db` ou `.csv`. `backup:criar` não recebe payload: o main
   abre o diálogo de salvar com nome sugerido `zenite-AAAAAMMDD-HHmm.db` e filtro `.db`.
   `backup:restaurar` recebe `{ caminho }`, obrigatoriamente o retorno de `arquivos:abrir` com
   filtro `.db`. `exportacao:csv` recebe `{ titulo?, nomeSugerido?, cabecalhos, linhas }`; o main
   fixa o filtro `.csv` e escolhe o caminho.
3. **Retornos:** diálogos e exportação devolvem `{ caminho: string | null }`; `null` é cancelamento,
   nunca erro. `backup:criar` e `backup:restaurar` devolvem
   `{ caminho: string; bytes: number } | { caminho: null; bytes: 0 }`.
4. **Validação:** schemas ficam em `esquemas.ts` (somente no main). O schema de restauração valida
   apenas a forma do texto; allowlist, extensão, existência e `realpath` são checados no serviço,
   para o erro ser `CAMINHO_NAO_PERMITIDO`/`ARQUIVO_NAO_ENCONTRADO` e não `IPC_INVALIDO`.
   Limites do CSV: 50 colunas, 5000 linhas, 1000 caracteres por célula; linhas com largura
   diferente dos cabeçalhos falham no schema (`IPC_INVALIDO:exportacao:csv`).
5. **Diretório permitido na restauração:** `documents`, `downloads` e `userData` (inclusive
   descendentes), comparados por `path.resolve` + `realpathSync` e fronteira de separador, com
   extensão `.db` (case-insensitive). Caminho absoluto fora disso é `CAMINHO_NAO_PERMITIDO`.
6. **Confirmação e conexão:** a restauração exige `dialog.showMessageBox` nativa no main; cancelar
   devolve `{ caminho: null, bytes: 0 }`. `ServicoBackup` (Backend) valida, confirma, copia e fala
   com uma porta **interna do main** (não exposta ao renderer):

   ```ts
   interface PortaCicloBanco {
     caminhoArquivo(): string // userData/zenite.db
     prepararCopia(): void // checkpoint WAL, implementado em main/banco
     fechar(): void // antes da cópia da restauração
     solicitarReabertura(): void // ED: app.relaunch() + app.exit() após a resposta IPC
   }
   ```

   A reabertura acontece no boot do app, com migrações, reconstruindo repositórios e serviços —
   nunca por substituição de `DatabaseSync` em uma instância já injetada. ED ajusta
   `registrarHandlers`/`main/index.ts` para receber a porta em vez do `db` cru; `before-quit`
   continua fechando a conexão vigente. O checkpoint de WAL para backup fica em `main/banco`,
   nunca no handler (R6).

7. **CSV:** o main escapa aspas duplas e prefixa com `'` toda célula cujo texto, após espaços
   iniciais, começa com `=`, `+`, `-` ou `@` (formula injection). Sem PDF nesta entrega.
8. **Erros novos:** `ARQUIVO_NAO_ENCONTRADO`, `CAMINHO_NAO_PERMITIDO`, `BACKUP_FALHOU`,
   `EXPORTACAO_FALHOU` e `DIALOGO_FALHOU` (este último para falha da API nativa — cancelamento já
   é `null`). Nenhum detalhe de driver ou Zod cruza o IPC. **Migração:** nenhuma.
9. **Fora desta entrega:** notificações nativas de atraso (P6 já calcula a multa; não há fluxo de
   permissão/UI agora) e `safeStorage`/“lembrar de mim” (dado sensível sem necessidade: a senha hoje
   só autentica no main). Revisitar quando existir login persistente ou alerta de prazo.

## Alternativas descartadas

- **`<input type="file">` ou caminho digitado no renderer** — quebra R3, a CSP de produção e abre
  path traversal.
- **Trocar `DatabaseSync` em voo após a cópia** — repositórios ficariam com referência fechada;
  preferimos reabertura no boot.
- **PDF na mesma entrega** — dependência/encoder novo e risco de CSP sem demanda do painel.
- **Notificações e `safeStorage` agora** — escopo extra e material sensível sem caso de uso atual.

## Consequências

- `ApiZenite`/preload expõem `arquivos.*`, `backup.*` e `exportacao.csv`; nenhum módulo P1–P11 é
  alterado neste commit.
- Backend e ED precisam alinhar a assinatura da composition root e a porta de ciclo antes de
  registrar os handlers; a validação de caminho vive no serviço, não no handler.
- O renderer trata `caminho: null` como cancelamento e nunca monta caminhos.
- Revisitar se surgir exportação PDF, login persistente ou alerta de atraso.
