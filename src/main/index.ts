import path from 'node:path'
import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { PingPayload } from '../shared/contratos/modelos'
import { ConexaoBanco } from './banco/ConexaoBanco'
import { Migrador } from './banco/Migrador'
import { MIGRACOES } from './banco/migracoes'
import { registrarHandlers } from './ipc/handlers'
import { RegistroIpc } from './ipc/RegistroIpc'
import { criarJanelaPrincipal } from './janelas/JanelaPrincipal'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let conexaoBanco: ConexaoBanco | null = null

function iniciarBanco(): ConexaoBanco {
  const caminho = path.join(app.getPath('userData'), 'zenite.db')
  const conexao = new ConexaoBanco(caminho)
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()
  return conexao
}

function abrirJanela(): void {
  mainWindow = criarJanelaPrincipal(isDev)
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function sendPing(): void {
  const payload: PingPayload = {
    message: 'Ping from the main process',
    timestamp: Date.now(),
  }
  mainWindow?.webContents.send(CANAIS.ping, payload)
}

function buildApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Send Ping', click: () => sendPing() },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  conexaoBanco = iniciarBanco()
  registrarHandlers(new RegistroIpc(ipcMain), conexaoBanco.db)
  buildApplicationMenu()
  abrirJanela()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) abrirJanela()
  })
})

app.on('before-quit', () => {
  conexaoBanco?.fechar()
  conexaoBanco = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
