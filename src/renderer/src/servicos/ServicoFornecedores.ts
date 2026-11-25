import type {
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedorListarFiltros,
} from '../../../shared/contratos/modelos'

export class ServicoFornecedores {
  listar(filtros?: FornecedorListarFiltros): Promise<Fornecedor[]> {
    return window.electronAPI.fornecedores.listar(filtros)
  }

  buscarPorId(id: number): Promise<Fornecedor> {
    return window.electronAPI.fornecedores.buscarPorId(id)
  }

  criar(dados: FornecedorCriarEntrada): Promise<Fornecedor> {
    return window.electronAPI.fornecedores.criar(dados)
  }

  atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor> {
    return window.electronAPI.fornecedores.atualizar(dados)
  }

  inativar(id: number): Promise<void> {
    return window.electronAPI.fornecedores.inativar(id)
  }
}
