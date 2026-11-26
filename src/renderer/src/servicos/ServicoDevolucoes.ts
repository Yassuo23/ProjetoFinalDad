import { vigiarSessao } from './VigilanciaSessao'
import type {
  CalculoMulta,
  CalculoMultaEntrada,
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
  DevolucaoPendente,
} from '../../../shared/contratos/modelos'

export class ServicoDevolucoes {
  listar(filtros?: DevolucaoListarFiltros): Promise<Devolucao[]> {
    return vigiarSessao(window.electronAPI.devolucoes.listar(filtros))
  }

  buscarPorId(id: number): Promise<Devolucao> {
    return vigiarSessao(window.electronAPI.devolucoes.buscarPorId(id))
  }

  listarPendentes(data?: string): Promise<DevolucaoPendente[]> {
    return vigiarSessao(window.electronAPI.devolucoes.listarPendentes(data))
  }

  calcularMulta(dados: CalculoMultaEntrada): Promise<CalculoMulta> {
    return vigiarSessao(window.electronAPI.devolucoes.calcularMulta(dados))
  }

  criar(dados: DevolucaoCriarEntrada): Promise<Devolucao> {
    return vigiarSessao(window.electronAPI.devolucoes.criar(dados))
  }

  atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao> {
    return vigiarSessao(window.electronAPI.devolucoes.atualizar(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.devolucoes.inativar(id))
  }
}
