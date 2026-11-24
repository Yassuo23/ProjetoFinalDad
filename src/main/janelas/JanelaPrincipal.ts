import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { aplicarNavegacaoSegura } from '../seguranca/NavegacaoSegura'

/** No instalador o icone vem do executavel; no dev, de resources/. */
const iconeJanela = app.isPackaged
  ? undefined
  : path.join(__dirname, '../../../resources/icon.png')

/** Cria a única janela do app, já com isolamento e navegação restrita. */
export function criarJanelaPrincipal(isDev: boolean): BrowserWindow {
  const janela = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    center: true,
    show: false,
    title: 'Zênite — Aluguel Outdoor',
    icon: iconeJanela,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  // Nenhuma permissão de dispositivo é concedida por padrão (câmera, microfone, notificações...).
  const sessao = janela.webContents.session
  sessao.setPermissionRequestHandler((_conteudo, _permissao, responder) => {
    responder(false)
  })
  sessao.setPermissionCheckHandler(() => false)

  const urlDev = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL
  if (isDev && urlDev) {
    void janela.loadURL(urlDev)
    janela.webContents.openDevTools({ mode: 'detach' })
  } else {
    void janela.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  aplicarNavegacaoSegura(janela.webContents)

  return janela
}
