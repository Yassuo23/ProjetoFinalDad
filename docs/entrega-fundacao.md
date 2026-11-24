# Entrega da fundação — estado atual

**Branch:** `feat/contrato-p1-equipamentos` · **Situação:** commits locais verdes, **sem push**,
sem rebase e sem reescrita de histórico.

## O que está entregue

| Item | Evidência |
| --- | --- |
| Stack (Electron 45, TS 7 strict, Vite 8, 3 tsconfigs, scripts `dev`/`build`/`start`), electron-builder com `appId` e ícone | ADR 0001, `package.json`, `electron-builder.yml`, `resources/icon.png` |
| Contrato completo: canais, modelos, schemas Zod, erros de domínio e `ApiZenite` para P1–P11 | `src/shared/contratos/`, ADR 0002, 0006, 0011–0017, commits `bbd2e4c`, `02f4d0d` |
| SQLite em `app.getPath('userData')/zenite.db`, migrações versionadas 001–009 | ADR 0003, `src/main/banco/`, commits C0–C9 |
| Categorias (molde de camada) | `aa9f321` |
| P1 Equipamentos | `40e7f91`, `3c6f247`, `71a9b8a`, `cffcf2d`, `e12dfb1` |
| P2 Clientes + CEP | `657ad36`, `1b3916c`, `5cfb8b1`, `651ec38`, `9bb1948` |
| P4 Disponibilidade | `58d0c0d`–`5f2ecac` |
| P5 Reservas + clima | `b7eda7d`–`c77a206` |
| P6 Devoluções + multa | `8d2b399`–`488a7e1` |
| P7 Pagamentos | `ebffb2e`–`ec0a8ea` |
| Governança: sete agentes, CODEOWNERS, convenções POO e documentação do enunciado | ADR 0018, `AGENTS.md`, `.opencode/agents/`, `.github/CODEOWNERS`, `2be9f7b` |
| Hardening: instância única, menu/atalhos, permissões negadas, verificação de origem IPC, transporte `net.fetch` com timeout | ADR 0004, `d419e55`, `6edbcea`, `5ea54ad` |
| Arquivos nativos: diálogos, backup/restauração, exportação CSV com escape | ADR 0019, `07699ff`, `8c6348d`, `14e7adc`, `9a82ae9`, `59f851e`, `4cfe921` |
| Segurança documentada com evidências de teste | `docs/seguranca.md`, `88d34dc` |

## Verificação

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` — verdes no último commit
  conferido: **39 arquivos / 187 testes** (antes da tela de arquivos).
- `dist/preload/index.js` com único `require("electron")`; nenhum `require("../shared/...")`.
- CSP de produção em `dist/renderer/index.html` sem `'unsafe-inline'`, `'unsafe-eval'` ou `ws:`.
- Smoke real no Electron (fundação): janela aberta, banco criado no `userData`, canais de
  equipamentos exercitados. Smoke da cadeia reserva → devolução → pagamento e dos diálogos
  nativos ainda depende de execução com interface (ver pendências).
- Testes com dublês: nunca subimos o Electron no Vitest (`RegistradorFalso`, portas falsas).

## Donos (ADR 0018)

| Agente | Área |
| --- | --- |
| `arquiteto` (AS) | contrato, camadas, ADRs e revisão R1–R7; dono exclusivo de `shared/contratos/` e `migracoes/index.ts` |
| `especialista-desktop` (ED) | main, preload, janela, hardening e build |
| `backend` | serviços POO e handlers finos |
| `database` | repositórios parametrizados e migrações de módulo |
| `frontend` | renderer TypeScript puro e CSS |
| `qa` | gates, testes, smoke e riscos |
| `integrador` | PRs, branches, documentação e defesa |

## Pendências

1. Implementar P3, P8, P9, P10 e P11 (contratos já fechados), em quatro commits por pacote.
2. Fazer o smoke manual completo: cliente com CEP, reserva com clima, devolução com multa,
   pagamento, backup/exportação e restauração com reinício.
3. Injetrar `criarTransporteHttp()` nos serviços legados de CEP/clima (handoff ao API Engineer).
4. Revisão final R1–R7 e relatório de riscos residuais antes do PR/defesa.
5. Aviso do Vite 8 sobre `configLoader: 'native'` (import sem extensão em `vite.config.mts`);
   não afeta o build.
6. Confirmar o convite de `willcotil` no GitHub antes de qualquer push.
