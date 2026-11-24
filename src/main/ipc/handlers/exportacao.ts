import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaExportacaoCsv } from '../../../shared/contratos/esquemas'
import type { ServicoExportacao } from '../../servicos/ExportacaoServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida o agregado e delega a escrita ao serviço. */
export function registrarExportacao(registro: RegistroIpc, servico: ServicoExportacao): void {
  registro.registrar(CANAIS.exportacaoCsv, esquemaExportacaoCsv, async (entrada) =>
    servico.csv(entrada),
  )
}
