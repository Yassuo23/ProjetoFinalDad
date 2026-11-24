import { app, shell } from 'electron'
import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { AppInfo } from '../../../shared/contratos/modelos'
import type { ContainerAplicacao } from '../../nucleo/ContainerAplicacao'
import { urlExternaPermitida } from '../../seguranca/UrlsExternas'
import type { RegistroIpc } from '../RegistroIpc'

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

/**
 * Registro único de handlers. Os módulos de domínio serão ligados aqui pelo
 * composition root quando seus serviços estiverem disponíveis; o handler só
 * valida e delega, sem regra de negócio.
 */
export function registrarHandlers(registro: RegistroIpc, _container: ContainerAplicacao): void {
  registro.registrar(CANAIS.appInfo, esquemaSemEntrada, async () => obterAppInfo())

  registro.registrar(CANAIS.abrirExterno, esquemaAbrirExterno, async (url: string) => {
    if (!urlExternaPermitida(url)) {
      throw new Error('Link externo nao permitido.')
    }
    await shell.openExternal(url)
  })
}
