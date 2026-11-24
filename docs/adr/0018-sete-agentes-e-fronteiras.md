# ADR 0018 — Sete agentes e fronteiras de edição

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS) + produto

## Contexto

A fundação começou com dois agentes (`arquiteto`, `especialista-desktop`) e quatro devs informais
(B, C, D e frontend). O enunciado passou a exigir sete papéis. Sem fronteiras explícitas, os
conflitos mais prováveis — `shared/contratos/` e `migracoes/` — aconteceriam na integração.

## Decisão

Os sete agentes em `.opencode/agents/` são:

| Agente | Missão | Pastas que edita |
| --- | --- | --- |
| `arquiteto` (AS) | contrato, camadas, ADRs, revisão R1–R7 | `docs/adr/`, `src/shared/contratos/`, `AGENTS.md` |
| `especialista-desktop` (ED) | main, preload, janela, hardening, build | `src/main/index.ts`, `src/main/janelas/`, `src/main/seguranca/`, `src/preload/`, `vite.config.mts`, `tsconfig*` |
| `backend` | regra de negócio em serviços e handlers finos | `src/main/servicos/`, `src/main/ipc/handlers/*.ts` |
| `database` | repositórios, SQL parametrizado e migrações de módulo | `src/main/repositorios/`, `src/main/banco/migracoes/0*.ts` |
| `frontend` | renderer em TypeScript puro (ADR 0012) e CSS | `src/renderer/` |
| `qa` | gates, testes, smoke e revisão R1–R7 | `*.test.ts`, `docs/entrega-fundacao.md` |
| `integrador` | PRs, branches, documentação do enunciado e defesa | `CONTRIBUTING.md`, `README.md`, `docs/*.md`, `.github/CODEOWNERS` |

Regras de conflito:

1. `src/shared/contratos/` e `src/main/banco/migracoes/index.ts` são **exclusivos do AS**.
   Backend/Database pedem o contrato antes de começar (skill `ipc-novo-canal`).
2. Migrações novas usam o próximo número livre e são registradas no `index.ts` pelo AS; o dono do
   módulo escreve só o arquivo `NNN-modulo.ts`.
3. `src/main/ipc/handlers/index.ts` é o **composition root**: só o ED mexe na montagem.
4. Conflito entre agentes é resolvido no ADR, nunca no merge: quem chega segundo abre issue e
   espera decisão do AS.

## Alternativas descartadas

- **Um agente por dev (B/C/D)** — papéis e pessoas se confundem na rotativa; backend e database
  passaram a ser papéis reutilizáveis por qualquer módulo.
- **CODEOWNERS com times inexistentes** — GitHub rejeita; usa-se `@willcotil` com comentários e
  a tabela acima como fonte de verdade até os times serem criados.

## Consequências

- `.github/CODEOWNERS` mapeia as pastas; `AGENTS.md` e `CONTRIBUTING.md` passam a listar os sete.
- Cada agente tem frontmatter com `mode` e permissões; nenhum pode dar push direto na `main`.
- Se o número de agentes mudar, atualizar esta ADR antes de mexer nos arquivos.
