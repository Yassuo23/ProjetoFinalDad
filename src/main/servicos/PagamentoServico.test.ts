import { describe, expect, it, vi } from 'vitest'
import type {
  CodigoErroDominio,
  Pagamento,
  PagamentoRegistrarEntrada,
  PagamentosListarFiltros,
  Reserva,
  StatusPagamento,
  StatusReserva,
} from '../../shared/contratos/modelos'
import type { RepositorioPagamentos } from '../repositorios/PagamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'
import { ErroDeDominio } from './ErroDominio'
import { PagamentoServico } from './PagamentoServico'

const INICIO = '2026-12-01T00:00:00.000Z'
const FIM = '2026-12-05T00:00:00.000Z'
const DADOS: PagamentoRegistrarEntrada = { reservaId: 7, valor: 370, forma: 'pix' }

function pagamento(status: StatusPagamento = 'pendente'): Pagamento {
  return {
    id: 12,
    reservaId: 7,
    valor: 370,
    forma: 'pix',
    status,
    pagoEm: status === 'pago' ? '2026-11-23 12:00:00' : null,
    criadoEm: '2026-11-23 10:00:00',
  }
}

function reserva(status: StatusReserva = 'confirmada'): Reserva {
  return {
    id: 7,
    clienteId: 1,
    equipamentoId: 3,
    inicio: INICIO,
    fim: FIM,
    status,
    localAtividade: 'Serra da Mantiqueira',
    criadoEm: '2026-11-23 10:00:00',
  }
}

function pagamentosFalso(itens: readonly Pagamento[] = [pagamento()]) {
  const listar = vi.fn((_filtros?: PagamentosListarFiltros): Pagamento[] => [...itens])
  const buscarPorReserva = vi.fn(
    (reservaId: number): Pagamento | null =>
      itens.find((item) => item.reservaId === reservaId) ?? null,
  )
  const buscarPorId = vi.fn(
    (id: number): Pagamento | null => itens.find((item) => item.id === id) ?? null,
  )
  const criar = vi.fn((dados: PagamentoRegistrarEntrada): Pagamento => ({
    ...pagamento(),
    ...dados,
    id: 99,
    status: 'pendente',
    pagoEm: null,
  }))
  const confirmar = vi.fn((id: number): Pagamento | null => {
    const atual = itens.find((item) => item.id === id)
    return atual ? { ...atual, status: 'pago', pagoEm: '2026-11-23 12:00:00' } : null
  })
  const estornar = vi.fn((id: number): Pagamento | null => {
    const atual = itens.find((item) => item.id === id)
    return atual ? { ...atual, status: 'estornado' } : null
  })
  const existeParaReserva = vi.fn((_reservaId: number): boolean => itens.length > 0)
  const repositorio: RepositorioPagamentos = {
    listar,
    buscarPorReserva,
    buscarPorId,
    criar,
    confirmar,
    estornar,
    existeParaReserva,
  }
  return {
    repositorio,
    listar,
    buscarPorReserva,
    buscarPorId,
    criar,
    confirmar,
    estornar,
    existeParaReserva,
  }
}

function reservasFalso(encontrada: Reserva | null = reserva()) {
  const buscarPorId = vi.fn((_id: number): Reserva | null => encontrada)
  const repositorio: RepositorioReservas = {
    listar: () => [],
    buscarPorId,
    criar: () => reserva(),
    confirmar: () => reserva('confirmada'),
    cancelar: () => true,
    concluir: () => true,
    existeSobreposicao: () => false,
  }
  return { repositorio, buscarPorId }
}

function codigoDaRejeicao(acao: () => unknown): CodigoErroDominio {
  try {
    acao()
  } catch (erro) {
    if (erro instanceof ErroDeDominio) {
      expect(erro.message).toBe(erro.codigo)
      return erro.codigo
    }
    throw erro
  }
  throw new Error('Era esperado um erro de domínio')
}

describe('PagamentoServico', () => {
  it('lista delegando os filtros ao repositório', () => {
    const pagamentos = pagamentosFalso()
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)
    const filtros: PagamentosListarFiltros = { status: 'pendente', reservaId: 7 }

    expect(servico.listar(filtros)).toHaveLength(1)
    expect(pagamentos.listar).toHaveBeenCalledWith(filtros)
  })

  it('busca por reserva e rejeita quando não existe', () => {
    const existente = pagamentosFalso()
    const servico = new PagamentoServico(existente.repositorio, reservasFalso().repositorio)
    expect(servico.buscarPorReserva(7)).toEqual(pagamento())
    expect(existente.buscarPorReserva).toHaveBeenCalledWith(7)

    const ausente = pagamentosFalso([])
    const semPagamento = new PagamentoServico(ausente.repositorio, reservasFalso().repositorio)
    expect(codigoDaRejeicao(() => semPagamento.buscarPorReserva(404))).toBe(
      'PAGAMENTO_NAO_ENCONTRADO',
    )
  })

  it('registra pagamento de reserva confirmada ou concluída', () => {
    for (const status of ['confirmada', 'concluida'] as const) {
      const pagamentos = pagamentosFalso([])
      const servico = new PagamentoServico(
        pagamentos.repositorio,
        reservasFalso(reserva(status)).repositorio,
      )

      expect(servico.registrar(DADOS)).toMatchObject(DADOS)
      expect(pagamentos.criar).toHaveBeenCalledWith(DADOS)
    }
  })

  it('rejeita registro para reserva inexistente', () => {
    const pagamentos = pagamentosFalso([])
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso(null).repositorio)

    expect(codigoDaRejeicao(() => servico.registrar(DADOS))).toBe('RESERVA_NAO_ENCONTRADA')
    expect(pagamentos.criar).not.toHaveBeenCalled()
  })

  it('rejeita registro para reserva não confirmada nem concluída', () => {
    for (const status of ['pendente', 'cancelada'] as const) {
      const pagamentos = pagamentosFalso([])
      const servico = new PagamentoServico(
        pagamentos.repositorio,
        reservasFalso(reserva(status)).repositorio,
      )

      expect(codigoDaRejeicao(() => servico.registrar(DADOS))).toBe('RESERVA_NAO_CONFIRMADA')
      expect(pagamentos.criar).not.toHaveBeenCalled()
    }
  })

  it('rejeita valor zero, negativo ou não finito', () => {
    for (const valor of [0, -1, Number.NaN]) {
      const pagamentos = pagamentosFalso([])
      const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

      expect(codigoDaRejeicao(() => servico.registrar({ ...DADOS, valor }))).toBe(
        'VALOR_PAGAMENTO_INVALIDO',
      )
      expect(pagamentos.criar).not.toHaveBeenCalled()
    }
  })

  it('rejeita segundo pagamento da mesma reserva', () => {
    const pagamentos = pagamentosFalso()
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

    expect(codigoDaRejeicao(() => servico.registrar(DADOS))).toBe('PAGAMENTO_JA_REGISTRADO')
    expect(pagamentos.criar).not.toHaveBeenCalled()
  })

  it('confirma pagamento pendente', () => {
    const pagamentos = pagamentosFalso()
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

    expect(servico.confirmar(12).status).toBe('pago')
    expect(pagamentos.confirmar).toHaveBeenCalledWith(12)
  })

  it('rejeita confirmação de pagamento inexistente', () => {
    const pagamentos = pagamentosFalso([])
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

    expect(codigoDaRejeicao(() => servico.confirmar(404))).toBe('PAGAMENTO_NAO_ENCONTRADO')
  })

  it('rejeita confirmação de status já encerrado', () => {
    for (const status of ['pago', 'estornado'] as const) {
      const pagamentos = pagamentosFalso([pagamento(status)])
      const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

      expect(codigoDaRejeicao(() => servico.confirmar(12))).toBe('PAGAMENTO_JA_PAGO')
      expect(pagamentos.confirmar).not.toHaveBeenCalled()
    }
  })

  it('não devolve nulo se a confirmação ocorre em paralelo', () => {
    const pagamentos = pagamentosFalso()
    pagamentos.confirmar.mockReturnValue(null)
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

    expect(codigoDaRejeicao(() => servico.confirmar(12))).toBe('PAGAMENTO_JA_PAGO')
  })

  it('estorna pagamento pago', () => {
    const pagamentos = pagamentosFalso([pagamento('pago')])
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

    expect(servico.estornar(12).status).toBe('estornado')
    expect(pagamentos.estornar).toHaveBeenCalledWith(12)
  })

  it('rejeita estorno de pagamento inexistente', () => {
    const pagamentos = pagamentosFalso([])
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

    expect(codigoDaRejeicao(() => servico.estornar(404))).toBe('PAGAMENTO_NAO_ENCONTRADO')
  })

  it('rejeita estorno de status pendente ou estornado', () => {
    for (const status of ['pendente', 'estornado'] as const) {
      const pagamentos = pagamentosFalso([pagamento(status)])
      const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

      expect(codigoDaRejeicao(() => servico.estornar(12))).toBe('PAGAMENTO_JA_ESTORNADO')
      expect(pagamentos.estornar).not.toHaveBeenCalled()
    }
  })

  it('não devolve nulo se o estorno ocorre em paralelo', () => {
    const pagamentos = pagamentosFalso([pagamento('pago')])
    pagamentos.estornar.mockReturnValue(null)
    const servico = new PagamentoServico(pagamentos.repositorio, reservasFalso().repositorio)

    expect(codigoDaRejeicao(() => servico.estornar(12))).toBe('PAGAMENTO_JA_ESTORNADO')
  })
})
