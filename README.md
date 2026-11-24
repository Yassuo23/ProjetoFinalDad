# Zênite — Aluguel Outdoor

Sistema desktop para locadora de equipamentos de camping, escalada, ciclismo e trilha. Cadastro de
clientes e equipamentos, reservas com previsão do tempo, devolução com multa e pagamento, tudo em
um banco SQLite local.

## Stack

- **Electron 45** — main, preload isolado e renderer sem Node
- **TypeScript 7 (`strict`)** — `typescript7` para build; API 6.0 para o ESLint
- **Vite 8** — bundler do renderer, **sem framework** (ADR 0012)
- **Zod** — validação somente no main; o preload não importa Zod
- **SQLite nativo (`node:sqlite`)** — `userData/zenite.db`, migrações versionadas

## Arquitetura em quatro camadas

```
renderer (TS puro)  →  preload (contextBridge)  →  handler (valida)  →  serviço (regra)
                                                                       ↓
                                                          repositório (SQL parametrizado)
```

- `src/shared/contratos/` é a **fonte única** de canais, tipos, erros e schemas.
- `src/main/ipc/handlers/index.ts` é o **composition root**: instancia e injeta tudo.
- Sete agentes com pastas fechadas — veja a tabela em [`AGENTS.md`](AGENTS.md) e a
  [ADR 0018](docs/adr/0018-sete-agentes-e-fronteiras.md).

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | watch do main/preload + Vite + Electron com DevTools |
| `npm run build` | compila main/preload e empacota o renderer em `dist/` |
| `npm start` | roda o build atual |
| `npm run typecheck` | typecheck do renderer e do shared |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run test` | Vitest |
| `npm run dist` | instaladores em `release/` |

## Módulos

| Pacote | Módulo |
| --- | --- |
| P1 / P4 / P8 | Equipamentos, disponibilidade e manutenção |
| P2 / P3 | Clientes com CEP e fornecedores com CNPJ |
| P5 / P6 / P7 | Reservas com clima, devolução com multa e pagamentos |
| P9 / P10 / P11 | Feriados, usuários/perfis e painel |

## Segurança e decisões

- [`docs/seguranca.md`](docs/seguranca.md) — isolamento, allowlist, CSP e ameaças.
- [`docs/decisoes-ia.md`](docs/decisoes-ia.md) — uso de IA, avaliação de MCP e RAG.
- [`docs/adr/`](docs/adr/) — decisões difíceis de reverter (Contexto → Decisão → Consequências).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contrato primeiro, gates e fluxo de PR.

Regras curtas: nenhum `any`, nenhum canal fora de `canais.ts`, nenhuma regra no handler, nenhum
SQL fora do repositório, nenhuma dependência de runtime no preload além de `electron`.
