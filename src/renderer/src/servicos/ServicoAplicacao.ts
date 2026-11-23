import type { AppInfo } from '../../../shared/contratos/modelos'

const URL_DOCUMENTACAO = 'https://www.electronjs.org/docs'

/** Única ponte do renderer para appInfo/abrirExterno. */
export class ServicoAplicacao {
  informacoes(): Promise<AppInfo> {
    return window.electronAPI.appInfo()
  }

  async abrirDocumentacao(): Promise<void> {
    await window.electronAPI.abrirExterno(URL_DOCUMENTACAO)
  }
}
