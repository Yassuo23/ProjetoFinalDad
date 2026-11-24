import { session } from 'electron'

/** Câmera, microfone, localização e afins são negados por padrão. */
export function negarPermissoesDispositivo(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permissao, callback) => {
    callback(false)
  })
  session.defaultSession.setPermissionCheckHandler(() => false)
}
