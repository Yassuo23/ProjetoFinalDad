import path from 'node:path'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { PingPayload } from '../shared/contratos/modelos'
import { ConexaoBanco } from './banco/ConexaoBanco'
import { Migrador } from './banco/Migrador'
import { MIGRACOES } from './banco/migracoes'
import { registrarHandlers } from './ipc/handlers'
import { RegistroIpc } from './ipc/RegistroIpc'
import { criarJanelaPrincipal } from './janelas/JanelaPrincipal'
import { instalarMenu } from './janelas/MenuAplicacao'
import { aplicarCsp } from './seguranca/Csp'
import { criarVerificadorOrigem, urlAplicacao } from './seguranca/OrigemIpc'

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

function focarJanela(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    return
  }
  abrirJanela()
}

function iniciar(): void {
  app.whenReady().then(() => {
    aplicarCsp(session.defaultSession, isDev)
    conexaoBanco = iniciarBanco()

    const origem = criarVerificadorOrigem(urlAplicacao(isDev, __dirname))
    registrarHandlers(new RegistroIpc(ipcMain, origem), conexaoBanco.db)

    instalarMenu(isDev, { ping: sendPing })
    abrirJanela()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) abrirJanela()
    })
  })
}

// Uma única instância evita dois processos disputando o mesmo arquivo SQLite.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', focarJanela)
  iniciar()
}

app.on('before-quit', () => {
  conexaoBanco?.fechar()
  conexaoBanco = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
