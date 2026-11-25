import { existsSync } from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, ipcMain, Menu, session } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { PingPayload } from '../shared/contratos/modelos'
import { RegistroIpc } from './ipc/RegistroIpc'
import { registrarHandlers } from './ipc/handlers'
import { ConexaoBanco } from './banco/ConexaoBanco'
import { lerConfiguracaoBanco } from './banco/ConfiguracaoBanco'
import { Migrador } from './banco/Migrador'
import { MIGRACOES } from './banco/migracoes'
import { politicaCsp } from './seguranca/Csp'

const arquivoEnv = path.join(process.cwd(), '.env')
if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv)

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let conexaoBanco: ConexaoBanco | null = null
let encerrandoBanco = false

async function iniciarBanco(): Promise<ConexaoBanco> {
  const conexao = new ConexaoBanco(lerConfiguracaoBanco())
  const cliente = await conexao.obterCliente()
  try {
    await new Migrador(cliente.cliente, MIGRACOES).aplicarPendentes()
  } finally {
    cliente.liberar()
  }
  return conexao
}

function aplicarCsp(): void {
  const csp = politicaCsp(isDev ? 'desenvolvimento' : 'producao')
  session.defaultSession.webRequest.onHeadersReceived((detalhes, callback) => {
    callback({
      responseHeaders: {
        ...detalhes.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })
}

function mesmaPagina(atual: string, destino: string): boolean {
  try {
    const origem = new URL(atual)
    const alvo = new URL(destino)
    return (
      origem.protocol === alvo.protocol &&
      origem.host === alvo.host &&
      origem.pathname === alvo.pathname &&
      origem.search === alvo.search
    )
  } catch {
    return false
  }
}

function protegerJanela(janela: BrowserWindow): void {
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  janela.webContents.on('will-navigate', (evento, destino) => {
    const atual = janela.webContents.getURL()
    const navegacaoInicial = atual === '' || atual === 'about:blank'
    if (!navegacaoInicial && !mesmaPagina(atual, destino)) {
      evento.preventDefault()
      console.warn('Navegação bloqueada pelo hardening do Electron.')
    }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: app.getName(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  protegerJanela(mainWindow)

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers(conexao: ConexaoBanco): void {
  registrarHandlers(new RegistroIpc(ipcMain), conexao)
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

app.whenReady().then(async () => {
  aplicarCsp()
  conexaoBanco = await iniciarBanco()
  registerIpcHandlers(conexaoBanco)
  buildApplicationMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((erro: unknown) => {
  console.error('Falha ao iniciar o app ou conectar ao MySQL/MariaDB. Verifique o .env.', erro)
  app.exit(1)
})

app.on('before-quit', (evento) => {
  if (!conexaoBanco || encerrandoBanco) return

  evento.preventDefault()
  encerrandoBanco = true
  const banco = conexaoBanco
  conexaoBanco = null
  void banco.fechar().then(
    () => app.exit(0),
    (erro: unknown) => {
      console.error('Falha ao fechar a conexão com MySQL/MariaDB.', erro)
      app.exit(1)
    },
  )
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
