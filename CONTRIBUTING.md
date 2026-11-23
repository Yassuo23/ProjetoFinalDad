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
2. **Respeite o dono.** Fundação cuida de contrato, main/preload, hardening e categorias; Dev B de
   Clientes; Dev C de Equipamentos; Dev D de Reservas. Ninguém edita módulo alheio sem combinar.
3. **Leia as ADRs** em `docs/adr/`, em especial a 0004 (segurança) e a 0005 (camadas).

## Branches e commits

- `main` é protegida: PR + 1 aprovação, sem push direto.
- Nome: `feat/<modulo>-<tema>`, `fix/<tema>`, `docs/<tema>`.
- Commit convencional: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- **Um commit por processo, não por camada solta:** o pacote de módulo entra em quatro commits
  (repositório → serviço → handlers → renderer), cada um verde por si só.
- Mensagem em português, imperativa, sem ponto final.

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

- `willcotil` é colaborador do repositório. A adição no GitHub ainda é uma **pendência manual**:
  configurar `Settings → Collaborators → Add people` com o usuário `willcotil` e permissão
  `Write`. Enquanto isso, os commits locais já são assinados como
  `willcotil <willcotil@users.noreply.github.com>` e nenhum push é feito sem essa confirmação.
