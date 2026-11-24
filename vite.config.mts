import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { politicaCsp } from './src/main/seguranca/Csp'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const rendererRoot = path.join(projectRoot, 'src', 'renderer')

/**
 * O HTML do renderer permanece intacto; a meta CSP é trocada no servidor e no
 * build. O main também aplica a mesma política por header (`CspMain`).
 */
function cspPorAmbiente(isDev: boolean): Plugin {
  return {
    name: 'zenite-csp-por-ambiente',
    transformIndexHtml(html: string): string {
      return html.replace(
        /(<meta\s+http-equiv=["']Content-Security-Policy["'][\s\S]*?content=")[^"]*("[\s\S]*?\/>)/i,
        (_correspondencia: string, inicio: string, fim: string): string =>
          `${inicio}${politicaCsp(isDev)}${fim}`,
      )
    },
  }
}

export default defineConfig(({ command }) => ({
  root: rendererRoot,
  base: './',
  clearScreen: false,
  plugins: [tailwindcss(), cspPorAmbiente(command === 'serve')],
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
}))
