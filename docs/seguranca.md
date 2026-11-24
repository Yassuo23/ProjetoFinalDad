# Segurança — Zênite

Este documento consolida a postura de segurança do Electron e do contrato IPC. Decisões originais:
[ADR 0004](adr/0004-hardening-da-janela.md) e
[ADR 0002](adr/0002-contrato-de-comunicacao.md).

## 1. Isolamento da janela

| Configuração | Valor | Por quê |
| --- | --- | --- |
| `contextIsolation` | `true` | mantém o mundo do renderer separado do preload |
| `sandbox` | `true` | preload não pode carregar módulos Node arbitrários |
| `nodeIntegration` | `false` | renderer nunca recebe `require`, `process` ou `fs` |
| `webSecurity` | `true` | não desativar, nunca |
| Navegação | restrita | só `file://` do próprio bundle; URLs externas via allowlist |

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
- Estilos vivem em `src/renderer/src/style.css`; nenhum atributo `style=` inline.

## 4. Links externos

`shell.openExternal` só é chamado pelo handler `app:abrir-externo`, com:

1. protocolo **https** obrigatório;
2. hostname exatamente igual ou subdomínio de `electronjs.org`, `open-meteo.com`, `viacep.com.br`
   ou `brasilapi.com.br` (`src/main/seguranca/UrlsExternas.ts`).

Qualquer outra URL devolve `URL_NAO_PERMITIDA`. Nunca abra `file:`, `javascript:` ou `http:`.

## 5. APIs externas no main

CEP (ViaCEP → BrasilAPI), CNPJ (BrasilAPI), clima (Open-Meteo) e feriados (BrasilAPI) rodam no main
porque o renderer não tem `connect-src` externo na CSP de produção. Dados de erro são normalizados
para `CodigoErroDominio`; nenhuma exceção de driver ou resposta HTTP crua chega à tela.

**Risco residual:** `fetch` nesses serviços não usa timeout explícito; uma conexão travada pode
demorar. Mitigação futura: `AbortSignal.timeout`.

## 6. Banco e dados sensíveis

- SQL apenas em repositórios/migrações, sempre parametrizado (`?`); nenhuma concatenação.
- Senha de usuário é armazenada como hash `scrypt` com salt (`P10`); texto plano nunca é
  persistido, logado ou devolvido.

## 7. Revisão de segurança

Checklist R1–R7 em [`CONTRIBUTING.md`](../CONTRIBUTING.md). Itens de bloqueio: `nodeIntegration`,
`sandbox: false`, CSP de dev em produção, `openExternal` sem allowlist, handler sem validação e
qualquer dependência de runtime vazando para o preload.
