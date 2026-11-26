import { vigiarSessao } from './VigilanciaSessao'
import type {
  Categoria,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  PeriodoEntrada,
} from '../../../shared/contratos/modelos'

/**
 * Ponte tipada com o backend. Qualquer falha de canal é propagada para a tela,
 * que exibe `EstadoErro` com “Tentar de novo”. Nunca há dado de exemplo.
 */
export class EquipamentoServico {
  listar(filtros: EquipamentoListarFiltros = {}): Promise<Equipamento[]> {
    return vigiarSessao(window.electronAPI.equipamentos.listar(filtros))
  }

  listarCategorias(): Promise<Categoria[]> {
    return vigiarSessao(window.electronAPI.categorias.listar())
  }

  /** Disponibilidade real por período. */
  listarDisponiveis(periodo: PeriodoEntrada): Promise<Equipamento[]> {
    return vigiarSessao(window.electronAPI.equipamentos.listarDisponiveis(periodo))
  }

  buscarPorId(id: number): Promise<Equipamento> {
    return vigiarSessao(window.electronAPI.equipamentos.buscarPorId(id))
  }

  criar(dados: EquipamentoCriarEntrada): Promise<Equipamento> {
    return vigiarSessao(window.electronAPI.equipamentos.criar(dados))
  }

  atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento> {
    return vigiarSessao(window.electronAPI.equipamentos.atualizar(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.equipamentos.inativar(id))
  }
}
