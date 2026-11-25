import type { Equipamento, PeriodoEntrada } from '../../shared/contratos/modelos'
import type { RepositorioEquipamentos } from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoDisponibilidade } from './portas'

interface ItemParaValidar {
  readonly equipamentoId: number
}

export class DisponibilidadeServico implements ServicoDisponibilidade {
  constructor(private readonly repositorio: RepositorioEquipamentos) {}

  async listarDisponiveis(periodo: PeriodoEntrada): Promise<readonly Equipamento[]> {
    this.validarPeriodo(periodo)
    try {
      return await this.repositorio.listarDisponiveis(periodo)
    } catch (erro) {
      throw paraErroDominio(erro, 'disponibilidade')
    }
  }

  async validarItens(
    itens: readonly ItemParaValidar[],
    periodo: PeriodoEntrada,
  ): Promise<void> {
    this.validarPeriodo(periodo)

    let disponiveis: readonly Equipamento[]
    try {
      disponiveis = await this.repositorio.listarDisponiveis(periodo)
    } catch (erro) {
      throw paraErroDominio(erro, 'disponibilidade')
    }

    const idsDisponiveis = new Set(disponiveis.map((equipamento) => equipamento.id))
    const ausentes = [
      ...new Set(itens.map((item) => item.equipamentoId).filter((id) => !idsDisponiveis.has(id))),
    ]

    if (ausentes.length > 0) {
      throw new ErroDeDominio(
        'EQUIPAMENTO_INDISPONIVEL',
        `Equipamento(s) indisponível(is) para o período: ${ausentes.join(', ')}.`,
      )
    }
  }

  private validarPeriodo(periodo: PeriodoEntrada): void {
    if (periodo.dataInicio > periodo.dataFim) {
      throw new ErroDeDominio(
        'PERIODO_INVALIDO',
        'A data de início deve ser anterior ou igual à data de fim.',
      )
    }
  }
}
