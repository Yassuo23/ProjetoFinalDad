import { vigiarSessao } from './VigilanciaSessao'
import type {
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  PagamentoListarFiltros,
} from '../../../shared/contratos/modelos'

export class ServicoPagamentos {
  listar(filtros?: PagamentoListarFiltros): Promise<Pagamento[]> {
    return vigiarSessao(window.electronAPI.pagamentos.listar(filtros))
  }

  buscarPorId(id: number): Promise<Pagamento> {
    return vigiarSessao(window.electronAPI.pagamentos.buscarPorId(id))
  }

  criar(dados: PagamentoCriarEntrada): Promise<Pagamento> {
    return vigiarSessao(window.electronAPI.pagamentos.criar(dados))
  }

  atualizar(dados: PagamentoAtualizarEntrada): Promise<Pagamento> {
    return vigiarSessao(window.electronAPI.pagamentos.atualizar(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.pagamentos.inativar(id))
  }
}
