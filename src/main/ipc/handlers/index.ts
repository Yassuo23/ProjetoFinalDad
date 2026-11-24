import { app, shell } from 'electron'
import type { ContainerAplicacao } from '../../nucleo/ContainerAplicacao'
import type { RegistroIpc } from '../RegistroIpc'
import { registrarAplicacao } from './aplicacao'

/**
 * Registro unico de handlers. Os modulos de dominio serao ligados aqui pelo
 * composition root quando seus servicos estiverem disponiveis; o handler so
 * valida e delega, sem regra de negocio.
 */
export function registrarHandlers(registro: RegistroIpc, _container: ContainerAplicacao): void {
  registrarAplicacao(registro, {
    informacoes: () => ({
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
    }),
    abrirExterno: async (url) => {
      await shell.openExternal(url)
    },
  })
}
