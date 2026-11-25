import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Devolucao, Reserva } from '../../shared/contratos/modelos'
import type {
  EfeitosDevolucao,
  RepositorioDevolucoes,
  RepositorioReservas,
} from '../repositorios/portas'
import { DevolucaoServico } from './DevolucaoServico'

const ATUALIZADO = '2026-01-01T00:00:00.000Z'

function reserva(dataFim: string): Reserva {
  return {
    id: 7,
    clienteId: 3,
    dataReserva: '2026-01-01T10:00:00.000Z',
    dataInicio: '2026-01-05',
    dataFim,
    statusReserva: 'Confirmada',
    previsaoTempo: null,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function devolucao(): Devolucao {
  return {
    id: 1,
    reservaId: 7,
    dataDevolucaoEfetiva: '2026-01-13T10:00:00.000Z',
    estadoPosUso: 'Danificado',
    observacoes: null,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function repositorioDevolucoes(
  criarComEfeitos: (dados: unknown, efeitos: EfeitosDevolucao) => Promise<Devolucao>,
  anterior: Devolucao | null = null,
): RepositorioDevolucoes {
  return {
    listar: async () => [],
    buscarPorId: async () => devolucao(),
    buscarPorReserva: async () => anterior,
    criarComEfeitos,
    atualizar: async () => devolucao(),
    inativar: async () => true,
  }
}

function repositorioReservas(reservaAtual: Reserva): RepositorioReservas {
  return {
    listar: async () => [reservaAtual],
    buscarPorId: async () => reservaAtual,
    criar: async () => reservaAtual,
    atualizar: async () => reservaAtual,
    inativar: async () => true,
  }
}

describe('DevolucaoServico', () => {
  afterEach(() => {
    delete process.env.MULTA_DIARIA_VALOR
  })

  it('calcula multa por dia de atraso e encaminha manutenção em caso de dano', async () => {
    process.env.MULTA_DIARIA_VALOR = '20'
    const criarComEfeitos = vi.fn(async () => devolucao())
    const servico = new DevolucaoServico(
      repositorioDevolucoes(criarComEfeitos),
      repositorioReservas(reserva('2026-01-10')),
    )

    await servico.criar({
      reservaId: 7,
      dataDevolucaoEfetiva: '2026-01-13T10:00:00.000Z',
      estadoPosUso: 'Danificado',
    })

    expect(criarComEfeitos).toHaveBeenCalledWith(expect.any(Object), {
      valorMulta: 60,
      manutencao: true,
    })
  })

  it('não gera multa nem manutenção quando a devolução é pontual e perfeita', async () => {
    const criarComEfeitos = vi.fn(async () => devolucao())
    const servico = new DevolucaoServico(
      repositorioDevolucoes(criarComEfeitos),
      repositorioReservas(reserva('2026-01-14')),
    )

    await servico.criar({
      reservaId: 7,
      dataDevolucaoEfetiva: '2026-01-13T10:00:00.000Z',
      estadoPosUso: 'Perfeito',
    })

    expect(criarComEfeitos).toHaveBeenCalledWith(expect.any(Object), {
      valorMulta: 0,
      manutencao: false,
    })
  })

  it('impede duas devoluções para a mesma reserva', async () => {
    const criarComEfeitos = vi.fn(async () => devolucao())
    const servico = new DevolucaoServico(
      repositorioDevolucoes(criarComEfeitos, devolucao()),
      repositorioReservas(reserva('2026-01-10')),
    )

    await expect(
      servico.criar({ reservaId: 7, estadoPosUso: 'Perfeito' }),
    ).rejects.toMatchObject({ codigo: 'REGISTRO_DUPLICADO' })
    expect(criarComEfeitos).not.toHaveBeenCalled()
  })
})
