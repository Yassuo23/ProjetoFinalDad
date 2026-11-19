# Locadora — Electron + TypeScript base

A minimal, secure starting point for an Electron application written in TypeScript.

## Stack

- **Electron 45** — main process, preload and renderer
- **TypeScript 7** — strict mode, separate configs for Node-side and renderer code
- **Vite 8** — renderer dev server with HMR and production bundling
- **electron-builder** — packaging for Windows, Linux and macOS

## Project structure

```
.
├── electron-builder.yml        # Packaging configuration
├── vite.config.mts             # Renderer dev server / bundler config
├── tsconfig.base.json          # Shared compiler options
├── tsconfig.main.json          # Main + preload -> dist/
├── tsconfig.renderer.json      # Renderer type checking (no emit)
└── src
    ├── main/index.ts           # Electron main process (window, menu, IPC handlers)
    ├── preload/index.ts        # contextBridge API (the only renderer -> main bridge)
    ├── shared/ipc.ts           # Channel names and shared types
    └── renderer
        ├── index.html
        └── src
            ├── main.ts
            ├── style.css
            └── vite-env.d.ts
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Watch TypeScript, start Vite and launch Electron with DevTools |
| `npm run build` | Compile main/preload and bundle the renderer into `dist/` |
| `npm start` | Run the built application |
| `npm run typecheck` | Type check the renderer without emitting files |
| `npm run dist` | Build and create installers in `release/` |

## Security defaults

- `contextIsolation: true` and `sandbox: true`
- `nodeIntegration: false` — the renderer never gets Node access
- The renderer talks to Electron exclusively through the typed `window.electronAPI` bridge defined in `src/preload/index.ts`
- A Content Security Policy is set in `src/renderer/index.html` (relax it only where needed)

## Adding your own feature

1. Add a channel to `IpcChannels` in `src/shared/ipc.ts`.
2. Register a handler with `ipcMain.handle` in `src/main/index.ts`.
3. Expose a typed wrapper in `src/preload/index.ts` and extend `ElectronApi`.
4. Call `window.electronAPI.yourMethod()` from the renderer.

For main → renderer messages, use `webContents.send(channel, payload)` and expose an
`onXxx(callback)` subscription from the preload script, like the existing `onPing` example.
