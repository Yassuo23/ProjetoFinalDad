import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { CANAIS } from '../shared/contratos/canais'
import type { PingPayload } from '../shared/contratos/modelos'
import { ConexaoBanco } from './banco/ConexaoBanco'
import { Migrador } from './banco/Migrador'
import { MIGRACOES } from './banco/migracoes'
import { registrarHandlers } from './ipc/handlers'
import { RegistroIpc } from './ipc/RegistroIpc'
import { criarJanelaPrincipal, urlAplicacao } from './janelas/JanelaPrincipal'
import { criarMenuAplicacao } from './janelas/MenuAplicacao'
import { ContainerAplicacao } from './nucleo/ContainerAplicacao'
import { origemIpcConfiavel } from './seguranca/OrigemIpc'

const isDev = process.env.NODE_ENV === 'development'

let janelaPrincipal: BrowserWindow | null = null
let conexaoBanco: ConexaoBanco | null = null

function iniciarBanco(): void {
  const caminho = path.join(app.getPath('userData'), 'zenite.db')
  conexaoBanco = new ConexaoBanco(caminho)
  new Migrador(conexaoBanco.db, MIGRACOES).aplicarPendentes()
}

function enviarPing(): void {
  const payload: PingPayload = {
    message: 'Ping from the main process',
    timestamp: Date.now(),
  }
  janelaPrincipal?.webContents.send(CANAIS.ping, payload)
}

function focarJanela(): void {
  if (!janelaPrincipal) return
  if (janelaPrincipal.isMinimized()) janelaPrincipal.restore()
  janelaPrincipal.focus()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.whenReady().then(() => {
    iniciarBanco()
    if (!conexaoBanco) throw new Error('Falha ao abrir o banco local.')

    const container = new ContainerAplicacao(conexaoBanco.db)
    const urlApp = urlAplicacao(isDev, process.env.VITE_DEV_SERVER_URL)
    const registro = new RegistroIpc(ipcMain, {
      confiavel: (evento) => origemIpcConfiavel(evento, [urlApp]),
    })
    registrarHandlers(registro, container)

    criarMenuAplicacao(isDev, enviarPing)
    janelaPrincipal = criarJanelaPrincipal(isDev, process.env.VITE_DEV_SERVER_URL)
    janelaPrincipal.on('closed', () => {
      janelaPrincipal = null
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        janelaPrincipal = criarJanelaPrincipal(isDev, process.env.VITE_DEV_SERVER_URL)
      } else {
        focarJanela()
      }
    })
  })
}

app.on('second-instance', () => focarJanela())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  conexaoBanco?.fechar()
  conexaoBanco = null
})
