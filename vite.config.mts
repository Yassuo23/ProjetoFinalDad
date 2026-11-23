import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const rendererRoot = path.join(projectRoot, 'src', 'renderer')

export default defineConfig({
  root: rendererRoot,
  base: './',
  clearScreen: false,
  plugins: [tailwindcss()],
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
