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

## Database configuration

The app connects to MySQL/MariaDB using `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD` and `DB_SSL` from `.env`. Copy `.env.example` to `.env`, enter the connection
details and start the app. Never commit `.env` or expose its password. Set `DB_SSL=true` when
the server requires TLS; certificate verification remains enabled.

## Security defaults

- `contextIsolation: true` and `sandbox: true`
- `nodeIntegration: false` — the renderer never gets Node access
- The renderer talks to Electron exclusively through the typed `window.electronAPI` bridge defined in `src/preload/index.ts`
- A Content Security Policy is set in `src/renderer/index.html` (relax it only where needed)

## Adding your own feature

1. Add a channel string to `CANAIS` in `src/shared/contratos/canais.ts`.
2. Add the payload/return types to `modelos.ts` and the Zod schema to `esquemas.ts`.
3. Register a handler through `RegistroIpc` in `src/main/ipc/` (validate, then delegate).
4. Expose a typed function in `src/preload/index.ts` and extend `ApiZenite` in `api.ts`.
5. Call `window.electronAPI.yourMethod()` from the renderer.

For main → renderer messages, use `webContents.send(channel, payload)` and expose an
`onXxx(callback)` subscription from the preload script, like the existing `onPing` example.
