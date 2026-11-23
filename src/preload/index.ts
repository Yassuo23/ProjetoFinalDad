import { contextBridge, ipcRenderer } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { ApiZenite } from '../shared/contratos/api'
import type { PingPayload } from '../shared/contratos/modelos'

const api: ApiZenite = {
  appInfo: () => ipcRenderer.invoke(CANAIS.appInfo),

  abrirExterno: (url) => ipcRenderer.invoke(CANAIS.abrirExterno, url),

  onPing: (callback) => {
    const listener = (_evento: Electron.IpcRendererEvent, payload: PingPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(CANAIS.ping, listener)
    return () => ipcRenderer.removeListener(CANAIS.ping, listener)
  },

  categorias: { listar: () => ipcRenderer.invoke(CANAIS.categoriasListar) },
  clientes: { listar: () => ipcRenderer.invoke(CANAIS.clientesListar) },
  equipamentos: { listar: () => ipcRenderer.invoke(CANAIS.equipamentosListar) },
  reservas: { listar: () => ipcRenderer.invoke(CANAIS.reservasListar) },
}

contextBridge.exposeInMainWorld('electronAPI', api)
