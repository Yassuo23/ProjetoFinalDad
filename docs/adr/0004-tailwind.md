# ADR 0004 — Tailwind CSS no renderer

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS + ED), por exigência do professor

## Contexto

O enunciado do projeto final passou a exigir Tailwind CSS e proibir CSS puro. O renderer
recebido usa TypeScript puro, Vite 8 e um único `style.css` com variáveis, reset e regras
próprias. Antes de instalar qualquer coisa, verificamos a compatibilidade do caminho
preferencial (plugin Vite) com a versão fixada no projeto:

```
@tailwindcss/vite@4.3.5  peerDependencies.vite = ^5.2.0 || ^6 || ^7 || ^8
vite@8.3.8 (instalado)   → satisfaz ^8
tailwindcss@4.3.5        → versão correspondente do plugin
```

Não há incompatibilidade de peer dependency, então o fallback via PostCSS não é necessário.

## Decisão

Adotar Tailwind CSS v4 no renderer pelo plugin oficial do Vite:

1. `tailwindcss` e `@tailwindcss/vite` entram como `devDependencies` (ambos `^4.3.5`).
2. `vite.config.mts` registra `plugins: [tailwindcss()]`; nenhuma configuração do Tailwind
   fica em `tailwind.config.*` — a v4 descobre as fontes automaticamente a partir da raiz
   do Vite (`src/renderer`).
3. `src/renderer/src/tailwind.css` é o único arquivo de estilo: `@import 'tailwindcss'`
   traz preflight/utilitários e um bloco `@theme` registra as cores da paleta Zênite
   (`grafite`, `floresta`, `lima`, `geleira`, `granito`, `pedra`) e a fonte `sans`.
   `@theme` é configuração de tokens do Tailwind, não CSS de autoria.
4. `src/renderer/src/style.css` é removido. `main.ts` importa `./tailwind.css` e troca as
   classes artesanais por utilitários (`bg-floresta`, `grid-cols-[repeat(...)]`,
   `border-granito/45`, `hover:bg-geleira`, etc.). Nenhum `style=` ou `<style>` é usado.
5. `AGENTS.md` ganha a regra 11: estilização só com Tailwind, sem CSS próprio.

## Alternativas descartadas

- **PostCSS (`postcss` + `@tailwindcss/postcss` + `postcss.config.*`)** — caminho válido,
  mas redundante: o plugin Vite atende ao peer range do Vite 8 com menos arquivos e sem
  uma etapa extra de configuração.
- **Manter `style.css` ao lado do Tailwind** — contraria a exigência do professor e cria
  duas fontes de verdade para cor/ espaçamento.
- **CSS-in-JS / estilos inline / `<style>` no HTML** — proibidos pela regra nova e pelo CSP;
  também impediriam o CSS de sair como arquivo estático em `dist/renderer`.
- **Trocar Vite 8 por Vite 7 para usar o plugin** — desnecessário e quebraria a ADR 0001.

## Consequências

- O build do renderer gera `dist/renderer/assets/index-*.css` referenciado por
  `<link rel="stylesheet">` no `index.html` — sem `<style>` embutido. `style-src 'self'`
  já atende ao CSS de produção.
- O preflight do Tailwind substitui o reset manual (`box-sizing`, `margin: 0` etc.).
- Cores e fonte da marca passam a ser tokens `@theme`; ajustes visuais devem usar
  utilitários e/ou esses tokens, nunca novas regras CSS.
- O `<meta>` de CSP atual ainda mantém `'unsafe-inline'` e `ws:` para suportar o HMR do
  Vite em desenvolvimento; endurecer o CSP de produção (regra 9 do `AGENTS.md`) fica como
  trabalho separado, com build-time transform, para não quebrar `npm run dev`.
- Revisitar se o `@tailwindcss/vite` passar a exigir Vite 9+ ou se o renderer ganhar um
  framework com requisitos próprios de estilização.
