import { vigiarSessao } from './VigilanciaSessao'
import type {
  OrdemManutencao,
  OrdemManutencaoAtualizarEntrada,
  OrdemManutencaoConcluirEntrada,
  OrdemManutencaoCriarEntrada,
  OrdemManutencaoListarFiltros,
} from '../../../shared/contratos/modelos'

/** Manutenção: o renderer apenas encaminha dados; regras ficam no main. */
export class ServicoManutencao {
  listar(filtros?: OrdemManutencaoListarFiltros): Promise<OrdemManutencao[]> {
    return vigiarSessao(window.electronAPI.manutencao.listar(filtros))
  }

  buscarPorId(id: number): Promise<OrdemManutencao> {
    return vigiarSessao(window.electronAPI.manutencao.buscarPorId(id))
  }

  criar(dados: OrdemManutencaoCriarEntrada): Promise<OrdemManutencao> {
    return vigiarSessao(window.electronAPI.manutencao.criar(dados))
  }

  atualizar(dados: OrdemManutencaoAtualizarEntrada): Promise<OrdemManutencao> {
    return vigiarSessao(window.electronAPI.manutencao.atualizar(dados))
  }

  concluir(dados: OrdemManutencaoConcluirEntrada): Promise<OrdemManutencao> {
    return vigiarSessao(window.electronAPI.manutencao.concluir(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.manutencao.inativar(id))
  }
}
