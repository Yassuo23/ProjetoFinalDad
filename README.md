# Zênite — Aluguel Outdoor

Sistema desktop de aluguel de equipamentos outdoor: camping, escalada, ciclismo e trilha.
Base Electron + TypeScript com foco em isolamento, contratos tipados e camadas explícitas.

## Stack

- **Electron 45** — main process, preload and renderer
- **TypeScript 7** — strict mode; `tsc` 7 for build, API 6.0 para o ESLint
- **Vite 8** — renderer dev server with HMR and production bundling
- **electron-builder** — packaging for Windows, Linux and macOS
- **Zod** — validação de payload no main (nunca no preload)

## Project structure

```
.
├── electron-builder.yml        # Packaging configuration
├── vite.config.mts             # Renderer dev server / bundler config
├── tsconfig.base.json          # Shared compiler options
├── tsconfig.main.json          # Main + shared -> dist/ (CJS)
├── tsconfig.renderer.json      # Renderer/preload type checking (no emit)
└── src
    ├── main/index.ts           # Electron main process (window, menu, IPC handlers)
    ├── preload/index.ts        # contextBridge API (bundled by esbuild)
    ├── shared/contratos        # canais, modelos, esquemas (Zod) e api
    └── renderer
        ├── index.html
        └── src
            ├── main.ts
            ├── style.css
            └── vite-env.d.ts
```

## Scripts

| Command             | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Watch TypeScript, start Vite and launch Electron with DevTools |
| `npm run build`     | Compile main/preload and bundle the renderer into `dist/`      |
| `npm start`         | Run the built application                                      |
| `npm run typecheck` | Type check the renderer without emitting files                 |
| `npm run dist`      | Build and create installers in `release/`                      |

## Security defaults

- `contextIsolation: true` and `sandbox: true`
- `nodeIntegration: false` — the renderer never gets Node access
- The renderer talks to Electron exclusively through the typed `window.electronAPI` bridge defined in `src/preload/index.ts`
- A Content Security Policy is set in `src/renderer/index.html` (relax it only where needed)

## Stripe (checkout hospedado)

A aba **Pagamentos** inicia um checkout via `window.electronAPI.stripe.criarCheckout`. Toda a
comunicação HTTP com a Stripe acontece no processo principal, em
`src/main/integracoes/stripe/`; o renderer recebe somente o DTO validado (`id`, `url`, `status`,
`expiraEm`) e abre a URL com `abrirExterno`, que só aceita `checkout.stripe.com`.

Copie `.env.example` para `.env` e preencha:

| Variável              | Descrição                                                                 |
| --------------------- | ------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`   | Chave secreta (`sk_test_...` em dev). Nunca use chave publicável.          |
| `STRIPE_API_BASE_URL` | Base da API (ex.: `https://api.stripe.com`). Sem caminho/query/fragmento. |
| `STRIPE_TIMEOUT_MS`   | Timeout por requisição em ms (1000–60000, padrão 10000).                   |
| `STRIPE_MOEDA`        | Moeda ISO de 3 letras em minúsculas (padrão `brl`).                        |
| `STRIPE_SUCCESS_URL`  | URL HTTPS pública de retorno após pagamento aprovado.                      |
| `STRIPE_CANCEL_URL`   | URL HTTPS pública de retorno quando o cliente cancela.                     |

`.env` é ignorado pelo Git e **não entra no instalador**; ele só é lido quando o app não está
empacotado. Em produção, forneça as variáveis pelo ambiente do sistema ou cofre do SO — nunca
embuta a chave secreta no bundle. Requisições usam timeout explícito, `Idempotency-Key` derivado
da cobrança e mensagens amigáveis: stack, headers, corpo e detalhes da Stripe não cruzam o IPC
(os códigos de erro ficam apenas no main).

O valor e o tipo da cobrança ainda vêm do formulário (wireframe 3.9); quando existir um serviço
de pagamentos no main, esse cálculo deve ser movido para lá. O checkout também não persiste a
baixa automaticamente: `STRIPE_SUCCESS_URL`/`STRIPE_CANCEL_URL` precisam ser páginas HTTPS públicas.

## Adding your own feature

1. Add a channel string to `CANAIS` in `src/shared/contratos/canais.ts`.
2. Add the payload/return types to `modelos.ts` and the Zod schema to `esquemas.ts`.
3. Register a handler through `RegistroIpc` in `src/main/ipc/` (validate, then delegate).
4. Expose a typed function in `src/preload/index.ts` and extend `ApiZenite` in `api.ts`.
5. Call `window.electronAPI.yourMethod()` from the renderer.

For main → renderer messages, use `webContents.send(channel, payload)` and expose an
`onXxx(callback)` subscription from the preload script, like the existing `onPing` example.
