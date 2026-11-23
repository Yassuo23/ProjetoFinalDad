# Zênite — Aluguel Outdoor

Sistema desktop de aluguel de equipamentos outdoor (camping, escalada, ciclismo e trilha).
Este arquivo é a fonte de verdade para pessoas e agentes de IA. Leia antes de codar.

## Stack

- Electron 45, TypeScript 7 (`strict`), Vite 8 no renderer, electron-builder.
- O `tsc` é o TypeScript 7 (alias `typescript7`); o pacote `typescript` expõe a API 6.0
  exigida pelo typescript-eslint. O lint roda sem type-checking.
- Três tsconfigs: `tsconfig.base.json`, `tsconfig.main.json` (CJS → `dist/`),
  `tsconfig.renderer.json` (`noEmit`), com `rootDir: src`.
- Sem framework no renderer: TypeScript puro.
- Estilização com Tailwind CSS v4 via plugin oficial do Vite (ADR 0004); sem CSS próprio.
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
├── main/                 # processo principal (Electron)
│   ├── index.ts          # composição: app, janela, registro de handlers
│   ├── ipc/              # RegistroIpc + handlers finos
│   ├── servicos/         # regra de negócio (POO)
│   ├── repositorios/     # SQL parametrizado
│   ├── banco/            # conexão e migrações
│   ├── janelas/          # criação de BrowserWindow
│   └── seguranca/        # allowlist, navegação, CSP
├── preload/index.ts      # única ponte renderer → main
├── renderer/             # HTML e TS puro (sem Node); estilos gerados pelo Tailwind
└── shared/contratos/     # canais, modelos, esquemas, API
```

## Donos

| Dono               | Escopo                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| Fundação (AS + ED) | estrutura, contrato IPC, main/preload, hardening, categorias como molde |
| Dev B              | módulo Clientes                                                         |
| Dev C              | módulo Equipamentos                                                     |
| Dev D              | módulo Reservas                                                         |

Ninguém edita o módulo do outro sem combinar. A fundação não implementa regra de negócio
de Cliente, Equipamento ou Reserva.

## As 10 regras invioláveis

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
   `'unsafe-inline'`, `ws:` ou `unsafe-eval`.
10. Cada commit compila (`npm run build`), passa lint e testes, e é mergeável sozinho.
11. Estilização **só com Tailwind CSS**: sem CSS próprio, sem `<style>`, sem `style=` inline e
    sem novos arquivos `.css` escritos à mão. Cores e fontes da marca vivem no `@theme` do
    arquivo de entrada do Tailwind; tudo o mais é utilitário nas classes do renderer.

## Fluxo de git

- `main` protegida: PR + 1 aprovação, sem push direto.
- Branch: `feat/<modulo>-<tema>`, `fix/<tema>`, `docs/<tema>`.
- Commit convencional: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- PR pequeno, com o que mudou, como testar e risco residual.
- Quem revisa: fundação revisa contrato e camadas; dono do módulo revisa a regra.
