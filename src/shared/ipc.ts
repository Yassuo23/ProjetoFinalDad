/**
 * Channel names shared by the main, preload and renderer processes.
 * A const enum is inlined by TypeScript, so the sandboxed preload script
 * never has to require another local file at runtime.
 */
export const enum IpcChannels {
  GetAppInfo = 'app:get-info',
  OpenExternal = 'app:open-external',
  Ping = 'app:ping',
}

export interface AppInfo {
  name: string
  version: string
  electron: string
  node: string
  platform: string
  arch: string
}

export interface PingPayload {
  message: string
  timestamp: number
}

/** The API exposed to the renderer through the preload script. */
export interface ElectronApi {
  getAppInfo(): Promise<AppInfo>
  openExternal(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void
}

declare global {
  interface Window {
    electronAPI: ElectronApi
  }
}
