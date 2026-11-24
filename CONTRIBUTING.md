# Contribuindo — Zênite

Antes de começar, leia [`AGENTS.md`](AGENTS.md). Ele é a fonte de verdade; este arquivo resume o
fluxo de trabalho e o que é exigido em revisão.

## Preparação

```bash
npm install
npm run dev        # main/preload em watch + Vite + Electron com DevTools
```

Requisitos: Node 24 (o `node:sqlite` é usado diretamente — não instale `better-sqlite3` nem
`@electron/rebuild`) e Electron 45.

## Antes de escrever código

1. **O contrato vem primeiro.** Nenhum módulo começa sem canais, payloads, retornos, códigos de
   erro e migração fechados em `src/shared/contratos/`. Se faltar algo, pare e peça à fundação —
   não invente canal.
2. **Respeite o dono.** Sete agentes com pastas fechadas (ADR 0018 e tabela no `AGENTS.md`):
   AS (contrato/ADRs), ED (main/preload/build), Backend (serviços/handlers), Database
   (repositórios/migrações de módulo), Frontend (renderer `.ts`), QA (testes/gates) e Integrador
   (PRs/docs). Ninguém edita módulo alheio sem combinar.
3. **Leia as ADRs** em `docs/adr/`: 0004 (segurança), 0005 (camadas), 0012 (renderer em TS puro)
   e 0018 (sete agentes).

## Branches e commits

- `main` é protegida: PR + 1 aprovação, sem push direto.
- Nome: `feat/<modulo>-<tema>`, `fix/<tema>`, `docs/<tema>`.
- Commit convencional: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- **Um commit por processo, não por camada solta:** o pacote de módulo entra em quatro commits
  (repositório → serviço → handlers → renderer), cada um verde por si só.
- Mensagem em português, imperativa, sem ponto final.
- Autoria: `willcotil <willcotil@users.noreply.github.com>`. Nunca rebasear nem reescrever o
  histórico local; integração é por PR, não por empurrar commit.
- **Conflitos mais prováveis:** `src/shared/contratos/` e `src/main/banco/migracoes/index.ts` são
  exclusivos do AS. Migração nova usa o próximo número livre; o dono escreve só
  `NNN-modulo.ts` e pede ao AS para registrá-la. Divergência de contrato vai para ADR, nunca para
  o merge.

## Padrões de código

- ESLint + Prettier: rode `npm run format` antes do commit; `npm run lint` não faz type-checking.
- Nomenclatura em português do domínio (`Equipamento`, `Reserva`, `Cliente`, `Devolucao`),
  camelCase em TypeScript, snake_case em SQL, `montarX` nas telas.
- `strict` sem `any`: `unknown` + type guard. Erro de domínio sempre com `CodigoErroDominio`.
- Teste ao lado do arquivo (`Servico.test.ts`, `Repositorio.test.ts`), uma asserção por regra.

## Gates obrigatórios (todos antes de cada commit)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Um commit que não compila ou quebra lint/teste não é mergeável. Além dos gates, confira:

- `dist/preload/index.js` só tem `require("electron")` — nenhum `require("../shared/...")`.
- `dist/renderer/index.html` não contém `'unsafe-inline'`, `'unsafe-eval'` nem `ws:`.

## Revisão

Fundação revisa contrato e camadas (R1–R7); o dono do módulo revisa a regra de negócio. Bloqueios
recorrentes:

| Regra | Bloqueio típico |
| --- | --- |
| R1 / R7 | `.js` de lógica em `src/`; `any` em vez de `unknown` + type guard |
| R2 / R3 | Zod no preload; `ipcRenderer`, `fetch` externo ou Node no renderer |
| R4 / R5 | string de canal fora de `canais.ts`; canal sem schema; regra dentro do handler |
| R6 | SQL fora de repositório ou sem `?` |
| Segurança | `nodeIntegration: true`, `sandbox: false`, `openExternal` sem allowlist, CSP de dev em produção |

PR pequeno, com: o que mudou, como testar e risco residual.

## Colaboradores

- `willcotil` foi convidado como colaborador no GitHub (confirmação pendente aceita). Os commits
  locais são assinados como `willcotil <willcotil@users.noreply.github.com>`. Push somente após
  aceitar o convite e conferir `origin`.
