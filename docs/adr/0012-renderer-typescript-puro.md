# ADR 0012 — Renderer em TypeScript puro

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS) e papel Frontend, confirmado pelo produto

## Contexto

O papel do Frontend descrevia "React + TypeScript", enquanto o roteiro e a ADR 0001 diziam
"`.tsx` ou `.ts` se vanilla" e o projeto já tem sete telas em `.ts`. A dúvida afeta o Vite
(entry point e transforms), a CSP (`unsafe-inline` é necessário para estilos dinâmicos em alguns
 setups) e o molde de tela que todos os devs copiam. Decisão difícil de reverter: trocar agora
 reescreveria todo o renderer verde.

## Decisão

O renderer continua **TypeScript puro (vanilla), sem React, Vue ou qualquer framework**, com
Vite 8 apenas como bundler e `index.html` + `src/renderer/src/main.ts` como entry point. O papel
do Frontend passa a dizer "TypeScript puro no renderer"; `.tsx` não é usado. Estilos ficam em
arquivos `.css` externos — a CSP de produção permanece `style-src 'self'`, sem `'unsafe-inline'`.
Cada módulo expõe uma função de montagem (`montarX(container: HTMLElement): void`) e usa somente
`window.electronAPI`.

## Alternativas descartadas

- **Migrar para React + TSX** — reescreve sete telas já testadas, muda o molde de todos os devs e
  acrescenta runtime sem resolver nenhum requisito do domínio (não há estado compartilhado
  complexo; cada tela é um formulário + lista).
- **Manter a ambiguidade ".tsx ou .ts"** — cada dev escolheria um padrão e o CODEOWNERS do
  Frontend perderia sentido; conflito garantido na integração.

## Consequências

- Nenhuma dependência nova no `package.json`; nenhuma mudança em `vite.config.mts`, tsconfigs ou
  CSP. A ADR 0001 permanece válida e esta a esclarece.
- O handbook do Frontend e os agentes `.opencode/agents/frontend.md` devem usar `.ts` e o molde
  `montarX`.
- Se o produto passar a exigir interface reativa (ex.: atualização em tempo real de reservas),
  reabrir esta ADR antes de introduzir framework.
