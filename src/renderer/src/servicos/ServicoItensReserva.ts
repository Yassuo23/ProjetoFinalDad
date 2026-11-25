import type {
  ChaveItemReservaEntrada,
  ItemReserva,
  ItemReservaAtualizarEntrada,
  ItemReservaCriarEntrada,
  ItemReservaListarFiltros,
} from '../../../shared/contratos/modelos'

export class ServicoItensReserva {
  listar(filtros?: ItemReservaListarFiltros): Promise<ItemReserva[]> {
    return window.electronAPI.itensReserva.listar(filtros)
  }

  buscarPorId(chave: ChaveItemReservaEntrada): Promise<ItemReserva> {
    return window.electronAPI.itensReserva.buscarPorId(chave)
  }

  criar(dados: ItemReservaCriarEntrada): Promise<ItemReserva> {
    return window.electronAPI.itensReserva.criar(dados)
  }

  atualizar(dados: ItemReservaAtualizarEntrada): Promise<ItemReserva> {
    return window.electronAPI.itensReserva.atualizar(dados)
  }

  remover(chave: ChaveItemReservaEntrada): Promise<void> {
    return window.electronAPI.itensReserva.remover(chave)
  }
}
