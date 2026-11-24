import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const rendererRoot = path.join(projectRoot, 'src', 'renderer')

const CSP_DEV =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws:"
const CSP_PRODUCAO =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"

/** Dev precisa de HMR; o bundle de produção não usa inline nem WebSocket. */
function politicaCsp(): Plugin {
  let producao = false
  return {
    name: 'zenite-csp',
    configResolved(config) {
      producao = config.command === 'build'
    },
    transformIndexHtml(html) {
      return html.replace('__ZENITE_CSP__', producao ? CSP_PRODUCAO : CSP_DEV)
    },
  }
}

export default defineConfig({
  root: rendererRoot,
  base: './',
  clearScreen: false,
  plugins: [tailwindcss(), politicaCsp()],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      // Allows importing shared types from src/shared while developing.
      allow: [projectRoot],
    },
  },
  build: {
    outDir: path.join(projectRoot, 'dist', 'renderer'),
    emptyOutDir: true,
  },
})
