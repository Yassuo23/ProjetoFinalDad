# Segurança — evidências do hardening

Checklist aplicado após a implementação dos CRUDs e das integrações externas.

## Janela

- `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true` em `src/main/index.ts`.
- Preload único: `dist/preload/index.js`, referenciado por `src/main/index.ts`.
- Bundle verificado: `dist/preload/index.js` contém somente `require("electron")`; não contém runtime do Zod nem imports de `shared/esquemas` ou `shared/modelos`.

## Navegação e janelas

- `will-navigate` em `src/main/index.ts` bloqueia qualquer destino diferente da página atual; apenas a navegação inicial (`about:blank`) é permitida.
- `setWindowOpenHandler(() => ({ action: 'deny' }))` em `src/main/index.ts`.

## Links externos

- `shell.openExternal` é chamado apenas depois de `urlExternaPermitida(url)`.
- A allowlist em `src/main/seguranca/UrlsExternas.ts` exige `https:` e compara `hostname`, não prefixo de string.
- Hosts permitidos: `electronjs.org`, `www.electronjs.org`, `github.com`, `www.github.com`.
- Evidência automatizada: `src/main/seguranca/UrlsExternas.test.ts` rejeita `file:`, `http:`, subdomínio fraudulento e texto que não é URL.
- Evidência manual pendente em ambiente com GUI: no DevTools, executar
  `window.electronAPI.abrirExterno('file:///C:/Windows/System32/calc.exe')`.
  Resultado esperado: rejeição com `URL_NAO_PERMITIDA` e nenhuma abertura do calculadora.

## CSP

- `src/renderer/index.html` não declara mais `<meta http-equiv="Content-Security-Policy">`.
- `src/main/seguranca/Csp.ts` gera a política por ambiente; `src/main/index.ts` aplica via header `Content-Security-Policy` antes de carregar a janela.
- Produção: sem `unsafe-inline`, `ws:` ou `unsafe-eval`; inclui `object-src 'none'`, `base-uri 'none'` e `frame-ancestors 'none'`.
- Desenvolvimento: mantém `ws:` e `unsafe-inline` somente para o HMR do Vite.
- Evidência automatizada: `src/main/seguranca/Csp.test.ts`.

## Dados e erros

- Todo handler passa pelo `RegistroIpc`, que valida o payload com Zod antes de delegar.
- Payloads inválidos devolvem `IPC_INVALIDO:<canal>`; detalhes do Zod são registrados apenas no console do main.
- Erros de domínio usam códigos estáveis de `CodigoErroDominio` (`REGISTRO_DUPLICADO`, `RELACAO_INVALIDA`, `NAO_ENCONTRADO`, `DADOS_INVALIDOS`, `URL_NAO_PERMITIDA`, entre outros).
- SQL dos repositórios é parametrizado; desde texto, datas e decimais são normalizados em `src/main/repositorios/mapeamento.ts`.
