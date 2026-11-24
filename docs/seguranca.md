# Evidências de hardening

## Stripe / Electron

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` mantidos em
  `src/main/index.ts`; preload único e sem `require("../shared/...")` no bundle.
- Navegação restrita à origem da janela (`will-navigate`) e janelas filhas bloqueadas
  (`setWindowOpenHandler → deny`).
- `shell.openExternal` é chamado somente após `validarUrlExterna`, com allowlist HTTPS de host
  exato (`checkout.stripe.com`, `electronjs.org`, `www.electronjs.org`), sem porta/userinfo/subdomínio.
- CSP de build gerada por `vite.config.mts`: sem `unsafe-inline`, `unsafe-eval` ou `ws:` em produção.
- Erros IPC perdem `stack` no main; somente a mensagem curta chega ao renderer.
- Chave secreta, URL base e payload bruto da Stripe ficam fora do bundle do renderer.

## Verificação automatizada

- `npm run build`, `npm run typecheck`, `npm run lint` e `npm test` (22 testes) passaram.
- Testes cobrem parser/DTO da Stripe, timeout, erros HTTP, idempotência, allowlist e sanitização
  de stack do IPC.

## Verificação manual pendente

- Abrir DevTools e executar
  `window.electronAPI.abrirExterno('file:///C:/Windows/System32/calc.exe')`.
  Resultado esperado: rejeição com “Este link externo não é permitido pela aplicação.”.
  Não executada neste ambiente por não haver sessão gráfica/interação com o Electron.
