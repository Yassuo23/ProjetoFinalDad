---
name: Electron — hardening
description: Checklist de isolamento e superfície de ataque para qualquer mudança no main, preload, janela ou CSP
---

# Hardening do Electron

Rode este checklist em toda mudança que toque `src/main`, `src/preload`, janela ou CSP.

## Janela

- [ ] `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- [ ] Preload aponta para um bundle único em `dist/preload/index.js`.
- [ ] Nenhuma opção nova de `webPreferences` sem justificativa no PR.

## Navegação e janelas

- [ ] `will-navigate` bloqueia destino diferente da URL atual do app.
- [ ] `setWindowOpenHandler` retorna `{ action: 'deny' }` por padrão.
- [ ] Nenhum link abre janela interna do Electron.

## Links externos

- [ ] `shell.openExternal` só é chamado por `urlExternaPermitida`.
- [ ] Allowlist compara hostname (não `startsWith` de string) e exige `https:`.
- [ ] URL vinda do renderer é tratada como não confiável.

## CSP

- [ ] Dev pode usar `ws:` e `'unsafe-inline'` para o HMR do Vite.
- [ ] Produção não tem `ws:`, `'unsafe-inline'` em `script-src` nem `unsafe-eval`.
- [ ] A política de produção é aplicada por header e/ou meta gerado no build, não herdada do dev.

## Dados e erros

- [ ] Todo handler valida o payload antes de delegar.
- [ ] Erro de IPC devolve código estável; stack e detalhe do Zod ficam no log do main.
- [ ] Nenhum segredo, caminho absoluto ou query aparece na mensagem ao renderer.

## Teste manual que vale ponto

No DevTools, tente `window.electronAPI.abrirExterno('file:///C:/Windows/System32/calc.exe')`.
O resultado deve ser rejeitado. Registre a evidência em `docs/seguranca.md`.
