import { vigiarSessao } from './VigilanciaSessao'
import type {
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedorListarFiltros,
} from '../../../shared/contratos/modelos'

export class ServicoFornecedores {
  listar(filtros?: FornecedorListarFiltros): Promise<Fornecedor[]> {
    return vigiarSessao(window.electronAPI.fornecedores.listar(filtros))
  }

  buscarPorId(id: number): Promise<Fornecedor> {
    return vigiarSessao(window.electronAPI.fornecedores.buscarPorId(id))
  }

  criar(dados: FornecedorCriarEntrada): Promise<Fornecedor> {
    return vigiarSessao(window.electronAPI.fornecedores.criar(dados))
  }

  atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor> {
    return vigiarSessao(window.electronAPI.fornecedores.atualizar(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.fornecedores.inativar(id))
  }
}
