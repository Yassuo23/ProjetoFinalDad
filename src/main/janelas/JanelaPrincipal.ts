import path from 'node:path'
import { BrowserWindow } from 'electron'
import { aplicarNavegacaoSegura } from '../seguranca/NavegacaoSegura'

/** Cria a única janela do app, já com isolamento e navegação restrita. */
export function criarJanelaPrincipal(isDev: boolean): BrowserWindow {
  const janela = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'Zênite — Aluguel Outdoor',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const urlDev = process.env.VITE_DEV_SERVER_URL
  if (isDev && urlDev) {
    void janela.loadURL(urlDev)
    janela.webContents.openDevTools({ mode: 'detach' })
  } else {
    void janela.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  aplicarNavegacaoSegura(janela.webContents)

  return janela
}
