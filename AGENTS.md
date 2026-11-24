# Zênite — Aluguel Outdoor

Sistema desktop de aluguel de equipamentos outdoor (camping, escalada, ciclismo e trilha).
Este arquivo é a fonte de verdade para pessoas e agentes de IA. Leia antes de codar.

## Stack

- Electron 45, TypeScript 7 (`strict`), Vite 8 no renderer, electron-builder.
- O `tsc` é o TypeScript 7 (alias `typescript7`); o pacote `typescript` expõe a API 6.0
  exigida pelo typescript-eslint. O lint roda sem type-checking.
- Três tsconfigs: `tsconfig.base.json`, `tsconfig.main.json` (CJS → `dist/`),
  `tsconfig.renderer.json` (`noEmit`), com `rootDir: src`.
- Sem framework no renderer: **TypeScript puro** (ADR 0012 — não use `.tsx`, React ou Vue).
- Estilização **somente com Tailwind CSS v4** via plugin oficial do Vite (ADR 0004 do upstream);
  sem CSS próprio. Cores, fontes e formas da marca vivem no `@theme` de `src/renderer/src/tailwind.css`.
- Banco: SQLite local em `app.getPath('userData')/zenite.db`.

## Comandos

| Comando             | Uso                                                   |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | watch do main/preload + Vite + Electron com DevTools  |
| `npm run build`     | compila main/preload e empacota o renderer em `dist/` |
| `npm start`         | roda o build atual                                    |
| `npm run typecheck` | typecheck do renderer e do shared                     |
| `npm run lint`      | ESLint (sem type-checking)                            |
| `npm run format`    | Prettier com escrita                                  |
| `npm run test`      | Vitest                                                |
| `npm run dist`      | instaladores em `release/`                            |

## Mapa de pastas

```
src/
├── main/                       # processo principal (Electron)
│   ├── index.ts                # app, janela e chamada ao composition root
│   ├── ipc/
│   │   ├── RegistroIpc.ts      # registro único: valida schema e delega
│   │   ├── handlers/           # um arquivo por módulo + index.ts (composition root)
│   │   └── index.ts            # ★ monta repositórios, serviços e handlers
│   ├── servicos/               # regra de negócio (POO, injeção por construtor)
│   ├── repositorios/           # SQL parametrizado + type guard de linha
│   ├── banco/
│   │   ├── ConexaoBanco.ts     # conexão userData/zenite.db
│   │   ├── Migrador.ts         # migrações versionadas
│   │   └── migracoes/          # 001..010 — registro só pelo AS
│   ├── janelas/                # BrowserWindow (sandbox + contextIsolation)
│   └── seguranca/              # allowlist, navegação, CSP por ambiente
├── preload/index.ts            # única ponte renderer → main (só CANAIS + tipos)
├── renderer/
│   ├── index.html              # HTML com CSP injetada pelo Vite por ambiente
│   └── src/
│       ├── main.ts             # shell, sidebar e registro de rotas
│       ├── nucleo/             # Componente, Roteador e helpers de DOM
│       ├── componentes/        # design system (Botao, Tabela, Campo...)
│       ├── layout/             # Sidebar, Cabecalho e AreaConteudo
│       ├── paginas/            # uma tela por módulo (montarX ou Componente)
│       ├── servicos/           # adaptadores da ApiZenite para as telas
│       └── tailwind.css        # @theme da marca — único arquivo de estilo
└── shared/
    └── contratos/
        ├── canais.ts           # único registro de strings de canal
        ├── modelos.ts          # tipos de payload/retorno + CodigoErroDominio
        ├── esquemas.ts         # Zod — somente no main
        ├── estados.ts          # EstadoEquipamento (fonte única)
        └── api.ts              # ApiZenite, porta tipada do renderer
```

## Sete agentes e donos (ADR 0018)

| Agente | Escopo | Pastas |
| --- | --- | --- |
| `arquiteto` (AS) | contrato, camadas, ADRs, revisão R1–R7 | `docs/adr/`, `shared/contratos/`, `AGENTS.md` |
| `especialista-desktop` (ED) | main, preload, janela, hardening, build | `main/index.ts`, `main/janelas/`, `main/seguranca/`, `preload/`, `vite.config.mts` |
| `backend` | serviços POO e handlers finos | `main/servicos/`, `main/ipc/handlers/*.ts` |
| `database` | repositórios e migrações de módulo | `main/repositorios/`, `main/banco/migracoes/NNN-*.ts` |
| `frontend` | renderer TypeScript puro e Tailwind | `renderer/` |
| `qa` | gates, testes, smoke e riscos | `*.test.ts`, `docs/entrega-fundacao.md` |
| `integrador` | PRs, branches, documentação e defesa | `CONTRIBUTING.md`, `README.md`, `docs/*.md`, `.github/` |

Ninguém edita o módulo do outro sem combinar. `shared/contratos/` e
`main/banco/migracoes/index.ts` são exclusivos do AS. Conflito de fronteira vai para ADR, nunca
para o merge. `.github/CODEOWNERS` espelha esta tabela.

## Ponto único de montagem e convenções POO

- `src/main/ipc/handlers/index.ts` é o **composition root**: instancia repositórios e serviços,
  injeta as portas e registra todos os handlers. Nenhum outro arquivo faz `new` de serviço.
- Serviço = classe com construtor que recebe **interfaces porta**; regra de negócio é método:
  `calcular`, `confirmar`, `verificar`. Repositório = classe que implementa a porta de dados.
- `ErroDeDominio` (`main/servicos/ErroDominio.ts`) é a classe base; sempre use um
  `CodigoErroDominio` do contrato. Nunca lance `Error` cru para o renderer.
- Nomenclatura: português do domínio (`Equipamento`, `Reserva`, `Cliente`, `Devolucao`), camelCase
  em código, snake_case em SQL, `montarX` para montar telas. Sem abreviações opacas.

## Regras invioláveis

1. Nenhum `.js` de lógica em `src/`. Tudo TypeScript.
2. Nenhum `any`. Use `unknown` + type guard ou schema.
3. O preload importa **somente** `shared/contratos/canais.ts` (constantes string) e tipos
   apagados no build. Zod no preload quebra o app sob `sandbox: true`.
4. O renderer não acessa Node, `ipcRenderer`, banco nem chave de API.
5. Todo canal existe em `canais.ts` e tem schema no main. Canal sem schema não existe.
6. Handler de IPC valida e delega; nenhuma decisão de negócio no handler.
7. Regra de negócio em serviço; acesso a dados em repositório; SQL sempre parametrizado.
8. `shell.openExternal` só com allowlist explícita de https e domínios.
9. `sandbox: true` e `contextIsolation: true` são inegociáveis; CSP de produção sem
   `'unsafe-inline'`, `'ws:'` ou `'unsafe-eval'`.
10. Cada commit compila (`npm run build`), passa lint e testes, e é mergeável sozinho.
11. Estilização **só com Tailwind CSS**: sem CSS próprio, sem `<style>`, sem `style=` inline e
    sem novos arquivos `.css` escritos à mão. Cores e fontes da marca vivem no `@theme` do
    `tailwind.css`; tudo o mais é utilitário nas classes do renderer.

## Fluxo de git

- `main` protegida: PR + 1 aprovação, sem push direto.
- Branch: `feat/<modulo>-<tema>`, `fix/<tema>`, `docs/<tema>`.
- Commit convencional: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- PR pequeno, com o que mudou, como testar e risco residual.
- Quem revisa: fundação revisa contrato e camadas; dono do módulo revisa a regra.
- Conflitos previsíveis: `shared/contratos/` e `migracoes/index.ts` são do AS; migração nova usa
  o próximo número livre e só o AS a registra. Não resolva divergência de contrato no merge —
  pare e abra decisão (ADR).
- Padrões de código: ESLint + Prettier (`npm run format`), nomes em português do domínio, `strict`
  sem `any`, testes ao lado do arquivo (`.test.ts`). Gate verde por commit, não por PR.

## Documentação do enunciado

`README.md` (visão geral), `CONTRIBUTING.md` (fluxo), `docs/seguranca.md` (Electron e hardening),
`docs/decisoes-ia.md` (MCP e RAG), `docs/design-system.md`, `docs/telas.md`,
`docs/divisao-pacotes.md`, `docs/entrega-fundacao.md` e `docs/adr/` (decisões difíceis de reverter).
