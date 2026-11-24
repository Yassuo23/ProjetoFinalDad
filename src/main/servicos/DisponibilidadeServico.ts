import type {
  DisponibilidadeResultado,
  Equipamento,
  EquipamentoDisponiveisEntrada,
  VerificarDisponibilidadeEntrada,
} from '../../shared/contratos/modelos'
import type { RepositorioEquipamentos } from '../repositorios/EquipamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'

/** Porta usada pelo handler e por outros serviços; implementação trocável nos testes. */
export interface ServicoDisponibilidade {
  verificar(entrada: VerificarDisponibilidadeEntrada): DisponibilidadeResultado
  filtrar(
    equipamentos: readonly Equipamento[],
    periodo: EquipamentoDisponiveisEntrada,
  ): Equipamento[]
}

/** Regra de disponibilidade: devolve resultado, nunca lança erro de domínio. */
export class DisponibilidadeServico implements ServicoDisponibilidade {
  constructor(
    private readonly reservas: RepositorioReservas,
    private readonly equipamentos: RepositorioEquipamentos,
  ) {}

  verificar(entrada: VerificarDisponibilidadeEntrada): DisponibilidadeResultado {
    const equipamento = this.equipamentos.buscarPorId(entrada.equipamentoId)
    if (!equipamento) {
      return { disponivel: false, motivo: 'EQUIPAMENTO_NAO_ENCONTRADO' }
    }
    if (entrada.inicio >= entrada.fim) {
      return { disponivel: false, motivo: 'PERIODO_INVALIDO' }
    }
    if (equipamento.estado !== 'disponivel') {
      return { disponivel: false, motivo: 'ITEM_INDISPONIVEL' }
    }
    if (this.reservas.existeSobreposicao(entrada.equipamentoId, entrada.inicio, entrada.fim)) {
      return { disponivel: false, motivo: 'ITEM_INDISPONIVEL' }
    }
    return { disponivel: true }
  }

  filtrar(
    equipamentos: readonly Equipamento[],
    periodo: EquipamentoDisponiveisEntrada,
  ): Equipamento[] {
    if (periodo.inicio >= periodo.fim) return []
    return equipamentos.filter(
      (equipamento) =>
        !this.reservas.existeSobreposicao(equipamento.id, periodo.inicio, periodo.fim),
    )
  }
}
