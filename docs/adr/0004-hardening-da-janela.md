# ADR 0004 — Hardening da janela e da superfície externa

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS decide a política; ED implementa)

## Contexto

O renderer roda conteúdo que não pode ser confiável para decidir qual programa o sistema
operacional executa nem para onde a janela navega. Antes do C8 havia três furos concretos:
`shell.openExternal` era chamado com qualquer URL validada só como "é uma URL"; a CSP estava
fixa no `index.html` com `'unsafe-inline'` e `ws:` (configuração de dev) também em produção; e a
criação da janela ficava inline no `main/index.ts`, sem navegação restrita.

## Decisão

1. **Isolamento:** `sandbox: true` e `contextIsolation: true` são inegociáveis;
   `nodeIntegration: false`. A janela passa a ser criada por `JanelaPrincipal`, fora do ciclo de
   vida do `main/index.ts`, mas sem mudar o contrato com o renderer.
2. **Links externos:** `shell.openExternal` só aceita `https:` e domínios da allowlist explícita
   em `UrlsExternas` (electronjs.org, open-meteo.com, viacep.com.br, brasilapi.com.br).
   Subdomínios são aceitos; correspondência por sufixo (`evil.com?next=electronjs.org` e
   `electronjs.org.evil.com` são rejeitados). Falha vira `URL_NAO_PERMITIDA`, um código do union
   `CodigoErroDominio`, sem detalhe de driver.
3. **Navegação:** `will-navigate` só permite a URL atual da própria janela e
   `setWindowOpenHandler` nega pop-ups. Navegação e abertura de janela são decisões do main.
4. **CSP por ambiente:** as duas políticas vivem em `shared/seguranca/politicasCsp.ts` (fonte
   única). A produção não contém `'unsafe-inline'`, `'unsafe-eval'` nem `ws:`; o dev contém
   `'unsafe-inline'` (cliente Vite) e `ws://localhost:5173` (HMR). O plugin `zenite-csp` do Vite
   injeta a política no `%ZENITE_CSP%` do HTML, e `aplicarCsp` reforça o header
   `Content-Security-Policy` via `webRequest.onHeadersReceived`.

## Alternativas descartadas

- **Confiar no `z.url()` do schema** — valida formato, não destino; permitiria `file:///` e
  `http://` com qualquer domínio.
- **CSP única de dev em todos os ambientes** — `ws:` e `unsafe-inline` em produção anulam a
  proteção contra injeção de script.
- **Bloquear navegação só com `will-navigate`** — pop-ups via `window.open` continuariam possíveis.
- **Deixar a allowlist no preload** — o preload roda sob `sandbox: true` e não pode carregar
  dependências de runtime; a regra fica no main.

## Consequências

- `CodigoErroDominio` ganha `URL_NAO_PERMITIDA` (já em `modelos.ts`); o renderer traduz o código.
- `src/main/seguranca/` passa a ter `UrlsExternas`, `NavegacaoSegura` e `Csp`, cada um com teste.
- `%ZENITE_CSP%` no `index.html` e o plugin no `vite.config.mts` são responsabilidade do ED;
  se o placeholder faltar, o HTML de produção herda a política de dev — o gate de build precisa
  conferir o HTML gerado.
- Revisitar a allowlist quando os serviços de CEP/CNPJ/clima (P2, P3, P5) entrarem; os domínios
  já estão previstos, mas a confirmação final é de quem implementar cada integração.
