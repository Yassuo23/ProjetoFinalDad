import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaDialogoAbrir, esquemaDialogoSalvar } from '../../../shared/contratos/esquemas'
import type { ServicoArquivos } from '../../servicos/ArquivosServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handlers finos: validam pelo schema e delegam. Nenhuma regra nem caminho aqui. */
export function registrarArquivos(registro: RegistroIpc, servico: ServicoArquivos): void {
  registro.registrar(CANAIS.arquivosAbrir, esquemaDialogoAbrir, async (entrada) =>
    servico.abrir(entrada),
  )

  registro.registrar(CANAIS.arquivosSalvar, esquemaDialogoSalvar, async (entrada) =>
    servico.salvar(entrada),
  )
}
