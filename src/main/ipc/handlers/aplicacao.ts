import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { AppInfo } from '../../../shared/contratos/modelos'
import { validarUrlExterna } from '../../seguranca/UrlsExternas'
import type { RegistroIpc } from '../RegistroIpc'

/** Porta mínima da aplicação; o adapter com Electron fica em `handlers/index.ts`. */
export interface ServicoAplicacaoIpc {
  informacoes(): AppInfo
  abrirExterno(url: string): Promise<void>
}

export function registrarAplicacao(registro: RegistroIpc, servico: ServicoAplicacaoIpc): void {
  registro.registrar(CANAIS.appInfo, esquemaSemEntrada, async () => servico.informacoes())

  registro.registrar(CANAIS.abrirExterno, esquemaAbrirExterno, async (url: string) => {
    validarUrlExterna(url)
    await servico.abrirExterno(url)
  })
}
