import { existsSync } from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../shared/contratos/esquemas'
import type { AppInfo, PingPayload } from '../shared/contratos/modelos'
import { RegistroIpc } from './ipc/RegistroIpc'
import { ConexaoBanco } from './banco/ConexaoBanco'
import { lerConfiguracaoBanco } from './banco/ConfiguracaoBanco'
import { Migrador } from './banco/Migrador'
import { MIGRACOES } from './banco/migracoes'

const arquivoEnv = path.join(process.cwd(), '.env')
if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv)

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let conexaoBanco: ConexaoBanco | null = null
let encerrandoBanco = false

async function iniciarBanco(): Promise<void> {
  conexaoBanco = new ConexaoBanco(lerConfiguracaoBanco())
  const conexao = await conexaoBanco.obterCliente()
  try {
    await new Migrador(conexao.cliente, MIGRACOES).aplicarPendentes()
  } finally {
    conexao.liberar()
  }
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

function obterAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  }
}

function registerIpcHandlers(): void {
  const registro = new RegistroIpc(ipcMain)

  registro.registrar(CANAIS.appInfo, esquemaSemEntrada, async () => obterAppInfo())

  registro.registrar(CANAIS.abrirExterno, esquemaAbrirExterno, async (url) => {
    await shell.openExternal(url)
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

app.whenReady().then(async () => {
  await iniciarBanco()
  registerIpcHandlers()
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
