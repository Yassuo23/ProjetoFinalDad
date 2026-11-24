# Segurança — implementação Electron

Dono da implementação: Especialista Desktop (ED). Este registro substitui o handoff
arquitetural de `docs/seguranca.md` pela evidência do código já entregue.

## Modelo de confiança

| Fronteira | Quem é confiável | Regra |
| --- | --- | --- |
| Renderer → preload | não confiável | só `window.electronAPI`, tipado por `ApiZenite`; sem `ipcRenderer` cru |
| Preload → main | não confiável | canal de `CANAIS` + schema Zod no main |
| Main → serviço | validado | handler delega; sem regra no handler |
| Serviço → repositório | interno | SQL parametrizado, sem concatenação |
| Main → API externa | não confiável | resposta tratada como `unknown`; timeout; allowlist |

## Medidas implementadas

| Medida | Ameaça bloqueada | Onde está no código |
| --- | --- | --- |
| `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` | Renderer acessar Node, SQLite ou chaves do main | `src/main/janelas/JanelaPrincipal.ts` |
| Preload empacotado com apenas `require("electron")` | Dependência local (Zod) carregada sob sandbox e quebrando o app | `src/preload/index.ts`, `npm run build:preload` |
| Uma função por canal em `ApiZenite` | Exposição de `ipcRenderer.invoke` genérico ao renderer | `src/preload/index.ts` |
| Registro único com schema Zod e canal de `CANAIS` | Canal solto, payload não validado, handler duplicado | `src/main/ipc/RegistroIpc.ts`, `src/main/ipc/handlers/index.ts` |
| Origem IPC conferida pelo frame principal e URL do app | Chamada feita por iframe ou página navegada para outro site | `src/main/seguranca/OrigemIpc.ts`, `src/main/index.ts` |
| `ErroApi` com código/mensagem pública; detalhe só no log do main | Vazamento de stack, SQL, token ou detalhe do Zod | `src/main/ipc/erros.ts`, `src/main/nucleo/erros.ts` |
| `shell.openExternal` precedido de allowlist `https:` + hostname exato/subdomínio | Execução de programa local via `file:///C:/Windows/System32/calc.exe` | `src/main/seguranca/UrlsExternas.ts`, `src/main/ipc/handlers/index.ts` |
| `will-navigate` e `will-frame-navigate` restritos à URL do app; `setWindowOpenHandler` nega | Phishing por redirecionamento e janelas filhas arbitrárias | `src/main/seguranca/NavegacaoSegura.ts`, `src/main/janelas/JanelaPrincipal.ts` |
| CSP de produção sem `unsafe-inline`, `unsafe-eval` ou `ws:`; dev separado | Injeção de script, HMR aberto em produção | `src/main/seguranca/Csp.ts`, `src/main/seguranca/CspMain.ts`, `vite.config.mts` |
| Permissões de dispositivo negadas por padrão | Câmera/microfone/localização sem consentimento explícito | `src/main/seguranca/Permissoes.ts` |
| DevTools e menu de recarga apenas com `NODE_ENV=development` | Inspeção e manipulação do app em produção | `src/main/janelas/MenuAplicacao.ts`, `src/main/janelas/JanelaPrincipal.ts` |
| Instância única do app | Segundo processo sobrepondo a janela e o banco local | `src/main/index.ts` |

## Evidência — `abrirExterno` com `file:///`

Teste automatizado em `src/main/seguranca/UrlsExternas.test.ts`:

```text
rejeita file:///C:/Windows/System32/calc.exe
  urlExternaPermitida(...) === false
  validarUrlExterna(...) lanca ErroSemPermissao
```

`validarUrlExterna` é chamada pelo handler antes de `shell.openExternal`, e o
`RegistroIpc` converte a exceção em `ErroApi` com código `SEM_PERMISSAO`. O renderer
recebe apenas a mensagem pública; o detalhe fica no console do main.

Resultado observado: `npm run test` — 25 testes aprovados após a suíte completa.

## Empacotamento

- `npm run dist`: instalador `release/Zênite Setup 0.1.0.exe` e diretório
  `release/win-unpacked` gerados por electron-builder sem assinatura de código.
- Abertura verificada no Windows: processo ativo com título `Zênite — Aluguel Outdoor`
  e janela principal carregada; processo encerrado logo após a verificação.

## Riscos residuais

- A CSP é aplicada duas vezes (meta gerada pelo Vite + header `onHeadersReceived`);
  em `file://` o header pode não ser disparado em todas as plataformas, e a meta
  gerada no build cobre esse caso.
- A allowlist de domínios externos precisa ser revisitada se uma nova integração
  HTTP entrar no contrato; o domínio deve entrar em `UrlsExternas` e na política
  CSP antes do código do serviço.
- O Vite 8 avisa que `vite.config.mts` importa `Csp.ts` sem extensão e com sintaxe
  ESM sob o loader nativo previsto para o futuro; o build atual usa o loader de
  bundle e a política gerada foi conferida no HTML de produção.
- Handlers de módulos de domínio ainda dependem dos serviços do BE; enquanto não
  existem, só os canais de fundação (`appInfo`, `abrirExterno`, `ping`) estão ativos.
