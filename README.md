# Zênite — Aluguel Outdoor

Sistema desktop para locadora de equipamentos outdoor (camping, escalada, ciclismo, caiaque e
prancha). Electron + TypeScript, com contrato IPC tipado, camadas explícitas e SQLite local.

## Stack

- **Electron 45** (Node 24.22.3 embutido) — main, preload e renderer
- **TypeScript 7** em `strict` (`typescript7` para build; API 6.0 para o ESLint)
- **Vite 8** no renderer, **Tailwind CSS v4** pelo plugin oficial (sem CSS próprio)
- **node:sqlite** (`DatabaseSync`) — sem addon nativo, sem rebuild de ABI
- **Zod** — validação de payload **somente no main**
- **Vitest** — testes unitários; **ESLint flat** + **Prettier** — qualidade

> O renderer é **TypeScript puro, sem React** (decisão do humano, ADR 0006).

## Como rodar

```powershell
npm install
npm run dev        # watch do main/preload + Vite + Electron com DevTools
npm run build      # compila main/preload e empacota o renderer em dist/
npm start          # roda o build atual
npm run dist       # instaladores em release/
```

Gates de todo commit:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

## Arquitetura

```
renderer (TS puro) → preload → IPC (canal + schema) → handler → serviço → repositório → SQLite
```

- `src/shared/contratos/canais.ts` é a **única** fonte de strings de canal (sem imports).
- `modelos.ts` (tipos), `esquemas.ts` (Zod, nunca no preload), `api.ts` (`ApiZenite`).
- `src/main/nucleo/` — erros de domínio e `ContainerAplicacao` (composition root).
- Regra de negócio em serviço; SQL parametrizado em repositório; handler só valida e delega.
- O banco fica em `app.getPath('userData')/zenite.db`, nunca em `dist/`.

Decisões e detalhes: `docs/adr/`, `docs/padroes-codigo.md`, `docs/dominio.md`,
`docs/seguranca.md`.

## Mapa de pastas

```
src/
├── main/
│   ├── index.ts              # ED: app, janela, menu, ciclo de vida
│   ├── nucleo/               # AS: erros, container, portas
│   ├── banco/                # conexão, migrador, migracoes/
│   ├── repositorios/         # BD: <modulo>/ (SQL parametrizado)
│   ├── servicos/             # BE: <modulo>/ (regra de negócio)
│   ├── integracoes/          # IA: cep/, clima/, cnpj/, feriados/
│   ├── ipc/                  # RegistroIpc + handlers/<modulo>/
│   ├── janelas/ e seguranca/ # ED
├── preload/index.ts          # ED: contextBridge
├── renderer/src/             # FE: nucleo/, componentes/, layout/, paginas/, servicos/
└── shared/contratos/         # AS: canais, modelos, esquemas, api
```

## Donos e contribuição

Sete papéis (AS, ED, BD, BE, IA, UX, FE) com fronteiras em `AGENTS.md` e `CODEOWNERS`.
Leia `CONTRIBUTING.md` antes de abrir PR: branch própria, um commit por etapa, 4 gates verdes e
revisão da fundação + dono do módulo.

## Segurança

Isolamento (`sandbox`/`contextIsolation`), validação no main, erro sem detalhe interno e
CSP rígida em produção. Riscos pendentes de correção pelo ED estão listados em
`docs/seguranca.md`.
