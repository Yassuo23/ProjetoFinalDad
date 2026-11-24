# Entrega da fundação — C0 a C9 + P1 e P2

**Branch:** `feat/contrato-p1-equipamentos` · **Situação:** commits locais verdes, **sem push**.

## O que está entregue

| Item | Evidência |
| --- | --- |
| Stack, contrato de comunicação e persistência SQLite com migrações versionadas | ADR 0001–0003 |
| Canais como constantes string + `ApiZenite` tipada, sem `any` e sem Zod no preload | `src/shared/contratos/`, bundle do preload com único `require("electron")` |
| Categorias ponta a ponta (molde de camada) | `aa9f321` |
| Equipamentos (P1): repositório, serviço, 6 handlers e tela | `40e7f91`, `3c6f247`, `71a9b8a`, `cffcf2d`, `e12dfb1` |
| Hardening: allowlist, navegação restrita, janela isolada, CSP por ambiente | `1b8743d`, `2328989`, `b9d55e2`, ADR 0004 |
| Clientes (P2): repositório, serviços (inclui consulta de CEP), 6 handlers e tela | `657ad36`, `1b3916c`, `5cfb8b1`, `651ec38`, `9bb1948`, ADR 0007 |
| Decisões de domínio, camadas e divisão dos pacotes | ADR 0005, 0006, `docs/divisao-pacotes.md` |
| Fluxo de contribuição e pendência de colaborador | `CONTRIBUTING.md` |

## Verificação

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` — verdes no último commit.
- 16 arquivos de teste, 47 testes.
- CSP de produção em `dist/renderer/index.html` sem `'unsafe-inline'`, `'unsafe-eval'` ou `ws:`.
- Smoke real no Electron: janela aberta, banco criado no `userData`, 6 canais de equipamentos
  exercitados (criar, listar, buscar, atualizar, filtrar, disponíveis, inativar, payload inválido).
- `reservas:listar` foi retirado do registro: nenhum canal órfão exposto na ponte (R4).

## Donos

| Responsável | Módulos |
| --- | --- |
| Fundação | contrato, main/preload, hardening, categorias, P9–P11 |
| Dev B | P2 Clientes + CEP (entregue), P3 Fornecedores + CNPJ |
| Dev C | P1 Equipamentos (entregue), P4 Disponibilidade, P8 Manutenção |
| Dev D | P5 Reservas + Clima, P6 Devoluções + Multa, P7 Pagamentos |

## Pendências

1. Confirmar o convite de `willcotil` no GitHub antes de qualquer push (convite já enviado).
2. Fechar o contrato de cada pacote seguinte **antes** da implementação; `reservas:listar` volta
   somente com o contrato do P5.
3. P4 deve acrescentar a interseção com reservas sobrepostas em `listarDisponiveis` — hoje o filtro
   considera apenas `estado` e `ativo`.
4. `CepServico` não tem timeout explícito no `fetch`; avaliar `AbortSignal.timeout` antes de P5.
5. Aviso do Vite 8 sobre `configLoader: 'native'` (import sem extensão em `vite.config.mts`); não
   afeta o build atual.
6. Revisitar a carência de 90 dias e o teto de 10–20% da multa antes de implementar o P6.
