import { vigiarSessao } from './VigilanciaSessao'
import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
  EnderecoCep,
} from '../../../shared/contratos/modelos'

export class ServicoClientes {
  listar(filtros?: ClienteListarFiltros): Promise<Cliente[]> {
    return vigiarSessao(window.electronAPI.clientes.listar(filtros))
  }

  buscarPorId(id: number): Promise<Cliente> {
    return vigiarSessao(window.electronAPI.clientes.buscarPorId(id))
  }

  buscarCep(cep: string): Promise<EnderecoCep> {
    return vigiarSessao(window.electronAPI.clientes.buscarCep(cep))
  }

  criar(dados: ClienteCriarEntrada): Promise<Cliente> {
    return vigiarSessao(window.electronAPI.clientes.criar(dados))
  }

  atualizar(dados: ClienteAtualizarEntrada): Promise<Cliente> {
    return vigiarSessao(window.electronAPI.clientes.atualizar(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.clientes.inativar(id))
  }
}
