# Segurança — Zênite

Este documento consolida a postura de segurança do Electron e do contrato IPC. Decisões originais:
[ADR 0020](adr/0020-hardening-da-janela.md) e
[ADR 0002](adr/0002-contrato-de-comunicacao.md).

## 1. Isolamento da janela

| Configuração | Valor | Por quê |
| --- | --- | --- |
| `contextIsolation` | `true` | mantém o mundo do renderer separado do preload |
| `sandbox` | `true` | preload não pode carregar módulos Node arbitrários |
| `nodeIntegration` | `false` | renderer nunca recebe `require`, `process` ou `fs` |
| `webSecurity` | `true` | não desativar, nunca |
| Navegação | restrita | só `file://` do próprio bundle; URLs externas via allowlist |
| Instância única | `requestSingleInstanceLock` | impede dois processos disputando o mesmo `zenite.db` |

Permissões de dispositivo (câmera, microfone, notificações) são negadas por padrão em
`JanelaPrincipal`. DevTools, recarga e force reload só existem no menu quando `NODE_ENV=development`.

## 2. Superfície IPC

- `CANAIS` em `src/shared/contratos/canais.ts` é o único registro de strings de canal.
  String literal fora dali é erro de revisão (R4).
- O preload importa **somente** constantes de canal e tipos apagados no build. Zod, `ErroDominio`
  e PortoSql não entram no bundle do preload — verificação: `dist/preload/index.js` deve conter
  apenas `require("electron")`.
- Todo canal passa por `RegistroIpc`, que valida com o schema Zod correspondente **no main** e só
  então delega ao serviço. Handler não toma decisão de negócio (R5).
- O renderer recebe `window.electronAPI` tipado por `ApiZenite`. Nunca `ipcRenderer` direto.

## 3. CSP por ambiente

- **Produção:** `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
  connect-src 'self'`. Sem `'unsafe-inline'`, `'unsafe-eval'` ou `ws:`.
- **Desenvolvimento:** `'unsafe-inline'` e `ws:` são necessários para Vite HMR e DevTools; só
  valem quando `NODE_ENV=development`.
- Verificação de release: `dist/renderer/index.html` não pode conter os tokens de dev.
- Estilos vivem em utilitários Tailwind v4 em `src/renderer/src/**/*.ts`, com tokens no `@theme`
  de `src/renderer/src/tailwind.css` (ADR 0004); não há CSS próprio nem atributo `style=` inline.

## 4. Links externos

`shell.openExternal` só é chamado pelo handler `app:abrir-externo`, com:

1. protocolo **https** obrigatório;
2. hostname exatamente igual ou subdomínio de `electronjs.org`, `open-meteo.com`, `viacep.com.br`
   ou `brasilapi.com.br` (`src/main/seguranca/UrlsExternas.ts`).

Qualquer outra URL devolve `URL_NAO_PERMITIDA`. Nunca abra `file:`, `javascript:` ou `http:`.

**Evidência de teste:** `src/main/seguranca/UrlsExternas.test.ts` chama
`urlExternaPermitida('file:///C:/Windows/System32/calc.exe')` e espera `false` — a tentativa de
abrir um executável local pelo `abrirExterno` é rejeitada antes de chegar ao `shell`.

## 4.1 Origem dos eventos IPC

`RegistroIpc` recebe um `VerificadorOrigem` (injetado pelo `main`) e exige que **tanto o frame
quanto o `webContents`** estejam na URL carregada pelo app (origem do Vite em dev, arquivo exato
em produção). Subframes e eventos sem essa estrutura são rejeitados com
`IPC_ORIGEM_INVALIDA:<canal>`, sem detalhe interno. Fora dos testes, registrar um handler sem
verificador de origem é erro de inicialização.

## 4.2 Transporte HTTP do main

`src/main/rede/TransporteHttp.ts` aplica a mesma allowlist das URLs externas e
`AbortSignal.timeout` (8 s por padrão). `criarTransporteHttp()` em
`src/main/rede/TransporteHttpMain.ts` fornece a instância com `net.fetch` do Electron para o API
Engineer injetar nos serviços de CEP/CNPJ/clima/feriados. Erros são internos (`ErroTransporte`);
o serviço de domínio decide o código devolvido ao renderer. Vitest usa um cliente falso — o
Electron nunca é iniciado nos testes.

## 5. APIs externas no main

CEP (ViaCEP → BrasilAPI), CNPJ (BrasilAPI), clima (Open-Meteo) e feriados (BrasilAPI) rodam no main
porque o renderer não tem `connect-src` externo na CSP de produção. Dados de erro são normalizados
para `CodigoErroDominio`; nenhuma exceção de driver ou resposta HTTP crua chega à tela.

**Risco residual:** os serviços legados de CEP/clima ainda chamam `fetch` direto; o transporte com
timeout já está disponível e a migração desses serviços é handoff ao API Engineer. A CSP de
produção mantém `connect-src 'self'`: nenhuma tela conversa diretamente com essas APIs.

## 6. Banco e dados sensíveis

- SQL apenas em repositórios/migrações, sempre parametrizado (`?`); nenhuma concatenação.
- Senha de usuário é armazenada como hash `scrypt` com salt (`P10`); texto plano nunca é
  persistido, logado ou devolvido.

## 6.1 Arquivos nativos (ADR 0019)

- Diálogos de abrir/salvar, confirmação de restauração, cópia e escrita ficam em
  `src/main/seguranca/ArquivosNativos.ts`. O renderer envia só título/filtros/dados; caminho é
  decidido no main e `caminho: null` é cancelamento, não erro.
- Restauração só aceita `.db` dentro de `documents`, `downloads` ou `userData` (inclusive
  descendentes), comparado por `realpath` + fronteira de separador. Fora disso:
  `CAMINHO_NAO_PERMITIDO`.
- CSV usa delimitador `,`, aspas dobradas e apóstrofo em células que começam com `=`, `+`, `-` ou
  `@` após espaços. Nenhuma fórmula é interpretada pela planilha.
- A restauração fecha a conexão, copia o arquivo e agenda `app.relaunch()` **após** a resposta IPC
  (ADR 0019); trocar `DatabaseSync` em voo deixaria os repositórios com referência morta.

## 7. Evidências de verificação

Comandos e resultados esperados (gates rodados antes de cada commit):

| Verificação | Evidência |
| --- | --- |
| `npm run build` | `dist/preload/index.js` contém **apenas** `require("electron")`; nenhum `require("../shared/...")` |
| `npm run test` | `UrlsExternas.test.ts`: `abrirExterno('file:///...')` → `false` / `URL_NAO_PERMITIDA` |
| `npm run test` | `Csp.test.ts`: CSP de produção sem `'unsafe-inline'`, `'unsafe-eval'` ou `ws:` |
| `npm run test` | `NavegacaoSegura.test.ts`: navegação externa bloqueada e pop-up negado, com `WebContents` falso |
| `npm run test` | `RegistroIpc.test.ts`: canal duplicado, payload inválido e origem não confiável rejeitados com `RegistradorFalso` |
| `npm run test` | `Csv.test.ts`: `=cmd`, `+cmd`, `@import` e `-2` neutralizados |
| inspeção | `dist/renderer/index.html` sem tokens de CSP de dev |
| inspeção | nenhum `fetch(`, `ipcRenderer` ou `require(` em `src/renderer/**/*.ts` |

Os testes usam portas/dublês falsos; **o Electron nunca é iniciado no Vitest**.

## 8. Revisão de segurança

Checklist R1–R7 em [`CONTRIBUTING.md`](../CONTRIBUTING.md). Itens de bloqueio: `nodeIntegration`,
`sandbox: false`, CSP de dev em produção, `openExternal` sem allowlist, handler sem validação e
qualquer dependência de runtime vazando para o preload.
