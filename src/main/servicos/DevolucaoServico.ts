import type {
  CalculoMulta,
  Devolucao,
  DevolucaoRegistrarEntrada,
  MultaCalcularEntrada,
} from '../../shared/contratos/modelos'
import type { RepositorioDevolucoes } from '../repositorios/DevolucaoRepositorio'
import type { RepositorioEquipamentos } from '../repositorios/EquipamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'
import { ErroDeDominio } from './ErroDominio'
import type { ServicoMulta } from './MultaServico'

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoDevolucoes {
  calcular(entrada: MultaCalcularEntrada): CalculoMulta
  registrar(dados: DevolucaoRegistrarEntrada): Devolucao
  buscarPorReserva(reservaId: number): Devolucao
}

const MS_POR_DIA = 86_400_000

/** Regras de devolução. Não conhece IPC, janela, renderer nem SQL. */
export class DevolucaoServico implements ServicoDevolucoes {
  constructor(
    private readonly devolucoes: RepositorioDevolucoes,
    private readonly reservas: RepositorioReservas,
    private readonly equipamentos: RepositorioEquipamentos,
    private readonly multas: ServicoMulta,
  ) {}

  calcular(entrada: MultaCalcularEntrada): CalculoMulta {
    const reserva = this.obterReserva(entrada.reservaId)
    if (entrada.devolvidoEm < reserva.inicio) {
      throw new ErroDeDominio(
        'DEVOLUCAO_DATA_INVALIDA',
        'A devolução não pode ser anterior ao início da reserva.',
      )
    }

    const equipamento = this.equipamentos.buscarPorId(reserva.equipamentoId)
    if (!equipamento) {
      throw new ErroDeDominio('EQUIPAMENTO_NAO_ENCONTRADO', 'Equipamento não encontrado.')
    }
    if (equipamento.valorAquisicao <= 0) {
      throw new ErroDeDominio(
        'MULTA_BASE_INDISPONIVEL',
        'Equipamento sem valor de aquisição para base de cálculo.',
      )
    }

    return this.multas.calcular({
      fim: reserva.fim,
      devolvidoEm: entrada.devolvidoEm,
      valorAquisicao: equipamento.valorAquisicao,
      precoDiaria: equipamento.precoDiaria,
      diasReserva: diasDaReserva(reserva.inicio, reserva.fim),
    })
  }

  registrar(dados: DevolucaoRegistrarEntrada): Devolucao {
    const calculo = this.calcular({ reservaId: dados.reservaId, devolvidoEm: dados.devolvidoEm })

    if (this.devolucoes.existeParaReserva(dados.reservaId)) {
      throw new ErroDeDominio('DEVOLUCAO_JA_REGISTRADA', 'Devolução já registrada.')
    }

    const reserva = this.obterReserva(dados.reservaId)
    if (reserva.status !== 'confirmada') {
      throw new ErroDeDominio('RESERVA_NAO_CONFIRMADA', 'Reserva não está confirmada.')
    }

    const criada = this.devolucoes.criar({
      reservaId: dados.reservaId,
      devolvidoEm: dados.devolvidoEm,
      observacoes: dados.observacoes ?? null,
      diasAtraso: calculo.diasAtraso,
      valorDiaria: calculo.valorDiaria,
      valorMulta: calculo.valorMulta,
    })
    this.reservas.concluir(dados.reservaId)
    return criada
  }

  buscarPorReserva(reservaId: number): Devolucao {
    const devolucao = this.devolucoes.buscarPorReserva(reservaId)
    if (!devolucao) {
      throw new ErroDeDominio('RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.')
    }
    return devolucao
  }

  private obterReserva(reservaId: number) {
    const reserva = this.reservas.buscarPorId(reservaId)
    if (!reserva) {
      throw new ErroDeDominio('RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.')
    }
    return reserva
  }
}

function diasDaReserva(inicio: string, fim: string): number {
  const diferencaMs = Date.parse(fim) - Date.parse(inicio)
  return Number.isFinite(diferencaMs) ? Math.max(1, Math.ceil(diferencaMs / MS_POR_DIA)) : 1
}
