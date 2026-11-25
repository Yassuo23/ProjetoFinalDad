import { describe, expect, it, vi } from 'vitest'
import type { Pagamento, Reserva } from '../../shared/contratos/modelos'
import type { RepositorioPagamentos, RepositorioReservas } from '../repositorios/portas'
import { PagamentoServico } from './PagamentoServico'

const ATUALIZADO = '2026-01-01T00:00:00.000Z'

const reserva: Reserva = {
  id: 4,
  clienteId: 2,
  dataReserva: '2026-01-01T10:00:00.000Z',
  dataInicio: '2026-01-05',
  dataFim: '2026-01-07',
  statusReserva: 'Confirmada',
  previsaoTempo: null,
  ativo: true,
  atualizadoEm: ATUALIZADO,
}

const pagamento: Pagamento = {
  id: 1,
  reservaId: 4,
  valorBase: 100,
  valorMulta: 0,
  valorTotal: 100,
  formaPagamento: null,
  statusPagamento: 'Pendente',
  dataPagamento: null,
  ativo: true,
  atualizadoEm: ATUALIZADO,
}

function repositorioPagamentos(criar: (dados: unknown) => Promise<Pagamento>): RepositorioPagamentos {
  return {
    listar: async () => [pagamento],
    buscarPorId: async () => pagamento,
    criar,
    atualizar: async () => pagamento,
    inativar: async () => true,
  }
}

function repositorioReservas(): RepositorioReservas {
  return {
    listar: async () => [reserva],
    buscarPorId: async () => reserva,
    criar: async () => reserva,
    atualizar: async () => reserva,
    inativar: async () => true,
  }
}

describe('PagamentoServico', () => {
  it('recalcula o total e data de pagamento ao criar um pagamento pago', async () => {
    const criar = vi.fn(async () => pagamento)
    const servico = new PagamentoServico(repositorioPagamentos(criar), repositorioReservas())

    const criado = await servico.criar({
      reservaId: 4,
      valorBase: 100,
      valorMulta: 10,
      statusPagamento: 'Pago',
    })

    expect(criado.valorTotal).toBe(110)
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        valorBase: 100,
        valorMulta: 10,
        statusPagamento: 'Pago',
        dataPagamento: expect.any(String),
      }),
    )
  })

  it('rejeita pagamento de reserva inexistente', async () => {
    const criar = vi.fn(async () => pagamento)
    const servico = new PagamentoServico(repositorioPagamentos(criar), {
      ...repositorioReservas(),
      buscarPorId: async () => null,
    })

    await expect(servico.criar({ reservaId: 99, valorBase: 10 })).rejects.toMatchObject({
      codigo: 'RELACAO_INVALIDA',
    })
    expect(criar).not.toHaveBeenCalled()
  })
})
