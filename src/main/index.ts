import path from 'node:path'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { PingPayload } from '../shared/contratos/modelos'
import { CicloBanco, type PortaCicloBanco } from './banco/CicloBanco'
import { ConexaoBanco } from './banco/ConexaoBanco'
import { Migrador } from './banco/Migrador'
import { MIGRACOES } from './banco/migracoes'
import { registrarHandlers } from './ipc/handlers'
import { RegistroIpc } from './ipc/RegistroIpc'
import { criarJanelaPrincipal } from './janelas/JanelaPrincipal'
import { instalarMenu } from './janelas/MenuAplicacao'
import { aplicarCsp } from './seguranca/Csp'
import { ArquivosNativos } from './seguranca/ArquivosNativos'
import { criarVerificadorOrigem, urlAplicacao } from './seguranca/OrigemIpc'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let cicloBanco: PortaCicloBanco | null = null

function caminhoBanco(): string {
  return path.join(app.getPath('userData'), 'zenite.db')
}

function iniciarBanco(caminho: string): ConexaoBanco {
  const conexao = new ConexaoBanco(caminho)
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()
  return conexao
}

function abrirJanela(): void {
  const janela = criarJanelaPrincipal(isDev)
  mainWindow = janela
  janela.once('ready-to-show', () => janela.show())
  janela.on('closed', () => {
    if (mainWindow === janela) mainWindow = null
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

    const caminho = caminhoBanco()
    cicloBanco = new CicloBanco(iniciarBanco(caminho), caminho, {
      // Agenda o reinício para depois da resposta IPC: `app.exit` é imediato.
      reiniciar: () => {
        setTimeout(() => {
          app.relaunch()
          app.exit(0)
        }, 100)
      },
    })

    instalarMenu(isDev, { ping: sendPing })
    abrirJanela()

    const origem = criarVerificadorOrigem(urlAplicacao(isDev, __dirname), () =>
      mainWindow?.webContents.mainFrame,
    )
    registrarHandlers(new RegistroIpc(ipcMain, origem), cicloBanco, new ArquivosNativos())

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
  cicloBanco?.fechar()
  cicloBanco = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
