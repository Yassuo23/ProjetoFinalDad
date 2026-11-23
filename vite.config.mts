import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { CSP_DEV, CSP_PRODUCAO } from './src/shared/seguranca/politicasCsp'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const rendererRoot = path.join(projectRoot, 'src', 'renderer')

export default defineConfig({
  root: rendererRoot,
  base: './',
  clearScreen: false,
  plugins: [
    {
      name: 'zenite-csp',
      transformIndexHtml(html, contexto) {
        return html.replace('%ZENITE_CSP%', contexto.server ? CSP_DEV : CSP_PRODUCAO)
      },
    },
  ],
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
