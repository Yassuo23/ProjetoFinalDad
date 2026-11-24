import { app, shell } from 'electron'
import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { AppInfo } from '../../../shared/contratos/modelos'
import type { ContainerAplicacao } from '../../nucleo/ContainerAplicacao'
import { ErroSemPermissao } from '../../nucleo/erros'
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
 * Registro unico de handlers. Os modulos de dominio serao ligados aqui pelo
 * composition root quando seus servicos estiverem disponiveis; o handler so
 * valida e delega, sem regra de negocio.
 */
export function registrarHandlers(registro: RegistroIpc, _container: ContainerAplicacao): void {
  registro.registrar(CANAIS.appInfo, esquemaSemEntrada, async () => obterAppInfo())

  registro.registrar(CANAIS.abrirExterno, esquemaAbrirExterno, async (url: string) => {
    if (!urlExternaPermitida(url)) {
      throw new ErroSemPermissao('Link externo nao permitido.')
    }
    await shell.openExternal(url)
  })
}
