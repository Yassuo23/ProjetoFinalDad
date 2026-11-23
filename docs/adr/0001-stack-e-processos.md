# ADR 0001 — Stack e processos da fundação

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS + ED)

## Contexto

Projeto final de Desenvolvimento de Aplicações Desktop, com 4 desenvolvedores em módulos
distintos e um prazo curto. A base recebida já roda com Electron 45, TypeScript 7 em modo
`strict`, Vite 8 no renderer e electron-builder, dividida em três tsconfigs com `rootDir: src`.
Não há banco, camada de serviços, validação, testes nem lint. O código precisa ser previsível
para quatro agentes de IA diferentes convergirem no mesmo padrão.

## Decisão

Manter a stack recebida (Electron 45 + TS 7 + Vite 8 + electron-builder) e adicionar apenas
o necessário para governança: contrato IPC único, camadas explícitas, validação no main,
SQLite local e gates de lint/teste. O main compila em CJS para `dist/`; o preload é empacotado
em um único arquivo; o renderer continua em TypeScript puro, sem framework.

O `tsc` de build continua sendo o TypeScript 7 (alias `typescript7`). O pacote `typescript`
aponta para a API 6.0 via `@typescript/typescript6`, que é o que o typescript-eslint consegue
consumir hoje. O lint roda sem type-checking; a checagem de tipos é feita pelo `tsc` 7.

## Alternativas descartadas

- **Trocar para React/Vue** — o renderer atual é pequeno; framework não resolve o problema
  de contrato e aumentaria o custo de onboarding dos 4 devs.
- **electron-vite / template pronto** — reescreveria a base e esconderia decisões que o
  enunciado pede para justificar.
- **Um único tsconfig** — misturaria libs de DOM e Node e permitiria que o renderer
  importasse código do main por acidente.

## Consequências

- Quatro devs conseguem trabalhar em paralelo desde que não toquem em `src/shared/contratos`.
- O preload precisa de bundling para continuar sob `sandbox: true`; `tsc` sozinho não basta.
- O lint roda sem type-checking porque o typescript-eslint ainda não consome a API do TS 7.
- Qualquer mudança de stack exige novo ADR e revisão da fundação.
