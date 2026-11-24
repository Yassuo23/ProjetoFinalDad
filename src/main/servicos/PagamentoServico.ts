import type {
  Pagamento,
  PagamentoRegistrarEntrada,
  PagamentosListarFiltros,
} from '../../shared/contratos/modelos'
import type { RepositorioPagamentos } from '../repositorios/PagamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'
import { ErroDeDominio } from './ErroDominio'

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoPagamentos {
  listar(filtros?: PagamentosListarFiltros): Pagamento[]
  buscarPorReserva(reservaId: number): Pagamento
  registrar(dados: PagamentoRegistrarEntrada): Pagamento
  confirmar(id: number): Pagamento
  estornar(id: number): Pagamento
}

/** Regras do ciclo de pagamento. Não conhece IPC, janela, renderer nem SQL. */
export class PagamentoServico implements ServicoPagamentos {
  constructor(
    private readonly pagamentos: RepositorioPagamentos,
    private readonly reservas: RepositorioReservas,
  ) {}

  listar(filtros: PagamentosListarFiltros = {}): Pagamento[] {
    return this.pagamentos.listar(filtros)
  }

  buscarPorReserva(reservaId: number): Pagamento {
    const pagamento = this.pagamentos.buscarPorReserva(reservaId)
    if (!pagamento) {
      throw new ErroDeDominio('PAGAMENTO_NAO_ENCONTRADO', 'Pagamento não encontrado.')
    }
    return pagamento
  }

  registrar(dados: PagamentoRegistrarEntrada): Pagamento {
    const reserva = this.reservas.buscarPorId(dados.reservaId)
    if (!reserva) {
      throw new ErroDeDominio('RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.')
    }
    if (reserva.status !== 'confirmada' && reserva.status !== 'concluida') {
      throw new ErroDeDominio(
        'RESERVA_NAO_CONFIRMADA',
        'Só é possível pagar uma reserva confirmada ou concluída.',
      )
    }
    if (!Number.isFinite(dados.valor) || dados.valor <= 0) {
      throw new ErroDeDominio('VALOR_PAGAMENTO_INVALIDO', 'Valor do pagamento deve ser positivo.')
    }
    if (this.pagamentos.existeParaReserva(dados.reservaId)) {
      throw new ErroDeDominio('PAGAMENTO_JA_REGISTRADO', 'Pagamento já registrado para a reserva.')
    }
    return this.pagamentos.criar(dados)
  }

  confirmar(id: number): Pagamento {
    const atual = this.pagamentos.buscarPorId(id)
    if (!atual) {
      throw new ErroDeDominio('PAGAMENTO_NAO_ENCONTRADO', 'Pagamento não encontrado.')
    }
    if (atual.status !== 'pendente') {
      throw new ErroDeDominio('PAGAMENTO_JA_PAGO', 'Pagamento não está pendente.')
    }

    const confirmado = this.pagamentos.confirmar(id)
    if (!confirmado) {
      throw new ErroDeDominio('PAGAMENTO_JA_PAGO', 'Pagamento não está mais pendente.')
    }
    return confirmado
  }

  estornar(id: number): Pagamento {
    const atual = this.pagamentos.buscarPorId(id)
    if (!atual) {
      throw new ErroDeDominio('PAGAMENTO_NAO_ENCONTRADO', 'Pagamento não encontrado.')
    }
    if (atual.status !== 'pago') {
      throw new ErroDeDominio('PAGAMENTO_JA_ESTORNADO', 'Pagamento não está pago.')
    }

    const estornado = this.pagamentos.estornar(id)
    if (!estornado) {
      throw new ErroDeDominio('PAGAMENTO_JA_ESTORNADO', 'Pagamento não está mais pago.')
    }
    return estornado
  }
}
