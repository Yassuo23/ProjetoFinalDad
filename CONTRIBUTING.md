# Como contribuir — Zênite

## Antes de começar

1. Leia `AGENTS.md` (regras invioláveis), `docs/padroes-codigo.md` e `docs/adr/`.
2. Confirme que você é dono da pasta/módulo (tabela em `AGENTS.md` e `CODEOWNERS`).
3. `git pull --rebase origin main` e crie sua branch.

## Branches

- `feat/<modulo>-<tema>` · `fix/<tema>` · `docs/<tema>` · `refactor/<tema>`
- Nunca commite direto em `main` (protegida: PR + 1 aprovação).

## Commits

Um commit por unidade lógica, mensagem no padrão `tipo: descrição` em português sem acento:

- `feat:` nova funcionalidade · `fix:` correção · `refactor:` sem mudança de comportamento
- `docs:` documentação · `chore:` infra/config · `test:` testes

## Antes de cada `git add`

```powershell
git grep -n "<<<<<<<\|>>>>>>>"
git add <arquivos-especificos>   # nunca git add -A as cegas
```

Se aparecer marcador de conflito, resolva antes de continuar. Em rebase, use
`git rebase --continue` — **nunca** `git rebase --skip` para fugir de conflito, e nunca
`git push --force` na `main`.

## Gates (obrigatórios em todo commit)

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

Os 4 precisam passar. O build também gera `dist/preload/index.js` — confira que ele não contém
`require("../shared/...")` (R2).

## Pull request

- Descreva: o que mudou, como testar, risco residual.
- Fundação (AS + ED) revisa contrato, camadas, R1–R7 e hardening.
- Dono do módulo revisa a regra de negócio.
- Todo canal novo: `canais.ts` → `modelos.ts` → `esquemas.ts` → handler → serviço →
  repositório → preload → renderer, nessa ordem (skill `ipc-novo-canal`).

## Quem revisa o quê

| Arquivo/pasta                     | Revisor                         |
| --------------------------------- | ------------------------------- |
| `src/shared/contratos/`           | AS                              |
| `src/main/index.ts`, preload, CSP | ED                              |
| `src/main/servicos/`              | dono do módulo + AS (camadas)   |
| `src/main/repositorios/`, migrações | BD                            |
| `src/main/integracoes/`           | IA + ED (allowlist)             |
| `src/renderer/`                   | FE + UX (design system)         |
| `docs/adr/`, `AGENTS.md`          | AS                              |
