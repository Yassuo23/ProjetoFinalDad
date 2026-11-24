import type {
  Reserva,
  ReservaCriarEntrada,
  ReservasListarFiltros,
} from '../../shared/contratos/modelos'
import type { RepositorioClientes } from '../repositorios/ClienteRepositorio'
import type { RepositorioEquipamentos } from '../repositorios/EquipamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'
import type { ServicoDisponibilidade } from './DisponibilidadeServico'
import { ErroDeDominio } from './ErroDominio'

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoReservas {
  listar(filtros?: ReservasListarFiltros): Reserva[]
  buscarPorId(id: number): Reserva
  criar(dados: ReservaCriarEntrada): Reserva
  confirmar(id: number): Reserva
  cancelar(id: number): void
}

/** O serviço de reservas só precisa da verificação pontual de disponibilidade. */
export type VerificadorDisponibilidade = Pick<ServicoDisponibilidade, 'verificar'>

/** Regras do ciclo de vida da reserva. Não conhece IPC, janela, clima nem SQL. */
export class ReservaServico implements ServicoReservas {
  constructor(
    private readonly reservas: RepositorioReservas,
    private readonly clientes: RepositorioClientes,
    private readonly equipamentos: RepositorioEquipamentos,
    private readonly disponibilidade: VerificadorDisponibilidade,
  ) {}

  listar(filtros?: ReservasListarFiltros): Reserva[] {
    return this.reservas.listar(filtros)
  }

  buscarPorId(id: number): Reserva {
    const reserva = this.reservas.buscarPorId(id)
    if (!reserva) {
      throw new ErroDeDominio('RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.')
    }
    return reserva
  }

  criar(dados: ReservaCriarEntrada): Reserva {
    if (dados.inicio >= dados.fim) {
      throw new ErroDeDominio('PERIODO_INVALIDO', 'O início deve ser anterior ao fim.')
    }

    const cliente = this.clientes.buscarPorId(dados.clienteId)
    if (!cliente || !cliente.ativo) {
      throw new ErroDeDominio('CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado ou inativo.')
    }

    const equipamento = this.equipamentos.buscarPorId(dados.equipamentoId)
    if (!equipamento || !equipamento.ativo) {
      throw new ErroDeDominio(
        'EQUIPAMENTO_NAO_ENCONTRADO',
        'Equipamento não encontrado ou inativo.',
      )
    }

    const disponivel = this.disponibilidade.verificar({
      equipamentoId: dados.equipamentoId,
      inicio: dados.inicio,
      fim: dados.fim,
    })
    if (disponivel.disponivel === false) {
      throw new ErroDeDominio(
        'ITEM_INDISPONIVEL',
        'Equipamento indisponível para o período informado.',
      )
    }

    return this.reservas.criar(dados)
  }

  confirmar(id: number): Reserva {
    const reserva = this.buscarPorId(id)
    if (reserva.status !== 'pendente') {
      throw new ErroDeDominio('RESERVA_JA_CONFIRMADA', 'Reserva já confirmada.')
    }

    const confirmada = this.reservas.confirmar(id)
    if (!confirmada) {
      throw new ErroDeDominio('RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.')
    }
    return confirmada
  }

  cancelar(id: number): void {
    const reserva = this.buscarPorId(id)
    if (reserva.status === 'cancelada') {
      throw new ErroDeDominio('RESERVA_JA_CANCELADA', 'Reserva já cancelada.')
    }
    // `concluida` também é terminal; o contrato não tem código próprio para ela.
    if (reserva.status === 'concluida') {
      throw new ErroDeDominio('RESERVA_JA_CANCELADA', 'Reserva concluída não pode ser cancelada.')
    }
    if (reserva.status !== 'pendente' && reserva.status !== 'confirmada') {
      throw new ErroDeDominio('RESERVA_JA_CONFIRMADA', 'Reserva já confirmada.')
    }

    if (!this.reservas.cancelar(id)) {
      throw new ErroDeDominio('RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.')
    }
  }
}
