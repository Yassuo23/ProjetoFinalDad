import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { BrowserWindow } from 'electron'
import { protegerNavegacao } from '../seguranca/NavegacaoSegura'

const LARGURA_INICIAL = 1200
const ALTURA_INICIAL = 800
const LARGURA_MINIMA = 800
const ALTURA_MINIMA = 600

/** URL carregada pela janela — usada tambem como allowlist de origem IPC. */
export function urlAplicacao(isDev: boolean, urlDev: string | undefined): string {
  if (isDev && urlDev) return urlDev
  return pathToFileURL(path.join(__dirname, '../renderer/index.html')).toString()
}

/**
 * Unica janela do aplicativo. Todas as opcoes de `webPreferences` que envolvem
 * isolamento sao fixas aqui: nao existe caminho que desligue `sandbox` ou
 * `contextIsolation` para "fazer funcionar".
 */
export function criarJanelaPrincipal(isDev: boolean, urlDev: string | undefined): BrowserWindow {
  const janela = new BrowserWindow({
    width: LARGURA_INICIAL,
    height: ALTURA_INICIAL,
    minWidth: LARGURA_MINIMA,
    minHeight: ALTURA_MINIMA,
    show: false,
    title: 'Zênite — Aluguel Outdoor',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  const webContents = janela.webContents
  protegerNavegacao(
    {
      aoNavegar: (ouvinte) => webContents.on('will-navigate', ouvinte),
      aoNavegarQuadro: (ouvinte) =>
        webContents.on('will-frame-navigate', (detalhes) => ouvinte(detalhes, detalhes.url)),
      aoAbrirJanela: (negar) => webContents.setWindowOpenHandler(negar),
    },
    urlAplicacao(isDev, urlDev),
  )

  if (isDev && urlDev) {
    void janela.loadURL(urlDev)
  } else {
    void janela.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  janela.once('ready-to-show', () => janela.show())
  if (isDev) webContents.openDevTools({ mode: 'detach' })
  return janela
}
