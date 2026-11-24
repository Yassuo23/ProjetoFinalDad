# Segurança — parte de arquitetura

- **Dono da implementação:** Especialista Desktop (ED). Este documento registra a intenção
  arquitetural e os riscos encontrados na base atual; a correção de código é handoff ao ED.

## Modelo de confiança

| Fronteira | Quem é confiável | Regra |
| --- | --- | --- |
| Renderer → preload | não confiável | só `window.electronAPI`,tipado; sem `ipcRenderer` cru |
| Preload → main | não confiável | canal de `CANAIS` + schema Zod no main |
| Main → serviço | validado | handler delega; sem regra no handler |
| Serviço → repositório | interno | SQL parametrizado, sem concatenação |
| Main → API externa | não confiável | resposta é `unknown` até Zod; timeout; allowlist |

## Controles obrigatórios

1. `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` — inegociáveis (R9).
2. Preload importa **somente** `src/shared/contratos/canais.ts` como valor; tipos são
   `import type`. Zod no preload quebra o app sob `sandbox: true` (R2).
3. Todo canal em `CANAIS` com schema em `esquemas.ts`; `RegistroIpc` rejeita canal duplicado
   e payload inválido sem devolver detalhe do Zod (R4/R5).
4. Erro para o renderer é `ErroApi` (código + mensagem pública + canal), sem `stack`, SQL,
   CPF ou token. `detalheInterno` fica só no log do main.
5. `shell.openExternal` somente com allowlist explícita de `https:` e domínios.
6. CSP de produção sem `'unsafe-inline'`, `'unsafe-eval'` nem `ws:`; esses valores são
   exclusivos do dev (HMR do Vite).
7. Nenhuma chamada de rede no renderer; CEP/clima/CNPJ/feriados no main, com allowlist.
8. Senha de usuário nunca em claro no SQLite: hash com salt (decisão de implementação do BE/ED,
   ver pergunta 8 em `docs/dominio.md`).

## Riscos encontrados na base atual (handoff ao ED)

| # | Arquivo : linha | Risco | Ação |
| - | --------------- | ----- | ---- |
| 1 | `src/main/index.ts:67-69` | `shell.openExternal(url)` repassa URL crua vinda do renderer | Implementar allowlist https + domínios antes de abrir |
| 2 | `src/renderer/index.html:9` | CSP única para dev e produção com `'unsafe-inline'` no `script-src` e `ws:` no `connect-src` | Separar dev/produção; produção sem esses tokens |
| 3 | `src/main/index.ts:104-113` | Nenhum bloqueio de navegação/janela nova (`will-navigate`, `setWindowOpenHandler`) | ED adicionar controles sem afrouxar isolamento |

Esses três pontos **bloqueiam aprovação** em review de segurança. Não foram alterados pelo AS
por serem competência do ED.

## Verificação de handoff

- `dist/preload/index.js` não contém `require("../shared/...")` (confirmado após Etapa 4:
  único `require` é `electron`).
- `npm run typecheck`, `lint`, `test`, `build` passam em cada commit.
- Nenhuma string de canal fora de `canais.ts` (`git grep` revisão).
