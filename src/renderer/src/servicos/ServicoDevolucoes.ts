import type {
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
} from '../../../shared/contratos/modelos'

export class ServicoDevolucoes {
  listar(filtros?: DevolucaoListarFiltros): Promise<Devolucao[]> {
    return window.electronAPI.devolucoes.listar(filtros)
  }

  buscarPorId(id: number): Promise<Devolucao> {
    return window.electronAPI.devolucoes.buscarPorId(id)
  }

  criar(dados: DevolucaoCriarEntrada): Promise<Devolucao> {
    return window.electronAPI.devolucoes.criar(dados)
  }

  atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao> {
    return window.electronAPI.devolucoes.atualizar(dados)
  }

  inativar(id: number): Promise<void> {
    return window.electronAPI.devolucoes.inativar(id)
  }
}
