import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels, type ElectronApi, type PingPayload } from '../shared/ipc'

const api: ElectronApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannels.GetAppInfo),

  openExternal: (url) => ipcRenderer.invoke(IpcChannels.OpenExternal, url),

  onPing: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: PingPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(IpcChannels.Ping, listener)
    return () => ipcRenderer.removeListener(IpcChannels.Ping, listener)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
