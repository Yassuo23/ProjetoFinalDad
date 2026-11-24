import path from 'node:path'
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import {
  esquemaAbrirExterno,
  esquemaCriarCheckoutStripe,
  esquemaListarClientes,
  esquemaSemEntrada,
} from '../shared/contratos/esquemas'
import type { AppInfo, PingPayload } from '../shared/contratos/modelos'
import { RegistroIpc } from './ipc/RegistroIpc'
import { ConexaoBanco } from './banco/ConexaoBanco'
import { Migrador } from './banco/Migrador'
import { MIGRACOES } from './banco/migracoes'
import { carregarAmbienteLocal } from './configuracao/ambiente'
import { lerConfiguracaoApiClientes } from './integracoes/clientes/configuracao'
import { ClientesApiServico } from './integracoes/clientes/ClientesApiServico'
import { lerConfiguracaoStripe } from './integracoes/stripe/configuracao'
import { StripeApiServico } from './integracoes/stripe/StripeApiServico'
import { validarUrlExterna } from './seguranca/allowlist'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let conexaoBanco: ConexaoBanco | null = null
let servicoStripe: StripeApiServico | null = null
let servicoClientesApi: ClientesApiServico | null = null

/** Configuração sob demanda: sem a API configurada, o renderer usa seu fallback tipado. */
function obterServicoClientesApi(): ClientesApiServico {
  if (!servicoClientesApi) {
    servicoClientesApi = new ClientesApiServico(lerConfiguracaoApiClientes(process.env))
  }
  return servicoClientesApi
}

/** Configuração sob demanda: sem Stripe configurado, o app continua abrindo. */
function obterServicoStripe(): StripeApiServico {
  if (!servicoStripe) {
    servicoStripe = new StripeApiServico(lerConfiguracaoStripe(process.env))
  }
  return servicoStripe
}

function iniciarBanco(): void {
  const caminho = path.join(app.getPath('userData'), 'zenite.db')
  conexaoBanco = new ConexaoBanco(caminho)
  new Migrador(conexaoBanco.db, MIGRACOES).aplicarPendentes()
}

function protegerNavegacao(janela: BrowserWindow): void {
  let origemDev: string | null = null
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    try {
      origemDev = new URL(process.env.VITE_DEV_SERVER_URL).origin
    } catch {
      origemDev = null
    }
  }

  janela.webContents.on('will-navigate', (evento, destino) => {
    try {
      const url = new URL(destino)
      const permitido = origemDev === null ? url.protocol === 'file:' : url.origin === origemDev
      if (!permitido) evento.preventDefault()
    } catch {
      evento.preventDefault()
    }
  })
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

function createWindow(): void {
  const janela = new BrowserWindow({
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
  mainWindow = janela
  protegerNavegacao(janela)

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void janela.loadURL(process.env.VITE_DEV_SERVER_URL)
    janela.webContents.openDevTools({ mode: 'detach' })
  } else {
    void janela.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  janela.once('ready-to-show', () => janela.show())
  janela.on('closed', () => {
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
    validarUrlExterna(url)
    await shell.openExternal(url)
  })

  registro.registrar(CANAIS.clientesListar, esquemaListarClientes, async (params) =>
    obterServicoClientesApi().listar(params ?? {}),
  )

  registro.registrar(CANAIS.stripeCriarCheckout, esquemaCriarCheckoutStripe, async (payload) =>
    obterServicoStripe().criarCheckout(payload),
  )
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
  carregarAmbienteLocal(app.isPackaged)
  iniciarBanco()
  registerIpcHandlers()
  buildApplicationMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  conexaoBanco?.fechar()
  conexaoBanco = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
