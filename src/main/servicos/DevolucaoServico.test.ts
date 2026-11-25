import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Devolucao, Reserva } from '../../shared/contratos/modelos'
import type {
  EfeitosDevolucao,
  RepositorioDevolucoes,
  RepositorioReservas,
} from '../repositorios/portas'
import { DevolucaoServico } from './DevolucaoServico'
import type { ServicoFeriados } from './portas'

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

/** Mapa ano → datasISO. Serve tanto para sucesso quanto para indisponibilidade. */
function feriados(datasPorAno: Readonly<Record<number, readonly string[]>> = {}): ServicoFeriados {
  return {
    feriados: async (ano) => ({
      estado: 'disponivel',
      ano,
      feriados: (datasPorAno[ano] ?? []).map((data, indice) => ({
        data,
        nome: `Feriado ${indice + 1}`,
      })),
    }),
  }
}

const feriadosIndisponiveis: ServicoFeriados = {
  feriados: async (ano) => ({ estado: 'indisponivel', ano, motivo: 'SERVICO_FORA', feriados: [] }),
}

async function efeitosPara(
  dataFim: string,
  dataDevolucao: string,
  servicoFeriados?: ServicoFeriados,
): Promise<EfeitosDevolucao> {
  const criarComEfeitos = vi.fn(async (_dados: unknown, _efeitos: EfeitosDevolucao) => devolucao())
  const servico = new DevolucaoServico(
    repositorioDevolucoes(criarComEfeitos),
    repositorioReservas(reserva(dataFim)),
    servicoFeriados,
  )
  await servico.criar({
    reservaId: 7,
    dataDevolucaoEfetiva: `${dataDevolucao}T10:00:00.000Z`,
    estadoPosUso: 'Danificado',
  })
  return criarComEfeitos.mock.calls[0]?.[1] as EfeitosDevolucao
}

describe('DevolucaoServico', () => {
  afterEach(() => {
    delete process.env.MULTA_DIARIA_VALOR
  })

  it('ignora domingo no atraso e encaminha manutenção em caso de dano', async () => {
    process.env.MULTA_DIARIA_VALOR = '20'
    const efeitos = await efeitosPara('2026-01-10', '2026-01-13', feriados())

    // 11/01 é domingo; 12 e 13 são dias cobráveis.
    expect(efeitos).toEqual({ valorMulta: 40, manutencao: true })
  })

  it('mantém a assinatura antiga de dois argumentos', async () => {
    process.env.MULTA_DIARIA_VALOR = '20'
    const efeitos = await efeitosPara('2026-01-10', '2026-01-13')

    expect(efeitos).toEqual({ valorMulta: 40, manutencao: true })
  })

  it('não cobra feriado nacional que não cai no domingo', async () => {
    process.env.MULTA_DIARIA_VALOR = '20'
    const efeitos = await efeitosPara('2026-02-13', '2026-02-17', feriados({ 2026: ['2026-02-16'] }))

    // 14 (sábado) e 17 (terça) contam; 15 (domingo) e 16 (Carnaval) não.
    expect(efeitos).toEqual({ valorMulta: 40, manutencao: true })
  })

  it('não desconta duas vezes feriado que cai no domingo', async () => {
    process.env.MULTA_DIARIA_VALOR = '20'
    const efeitos = await efeitosPara('2026-11-14', '2026-11-16', feriados({ 2026: ['2026-11-15'] }))

    expect(efeitos).toEqual({ valorMulta: 20, manutencao: true })
  })

  it('busca feriados dos dois anos quando a devolução cruza o Ano Novo', async () => {
    process.env.MULTA_DIARIA_VALOR = '20'
    const consultas: number[] = []
    const servico: ServicoFeriados = {
      feriados: async (ano) => {
        consultas.push(ano)
        return {
          estado: 'disponivel',
          ano,
          feriados: ano === 2027 ? [{ data: '2027-01-01', nome: 'Confraternização mundial' }] : [],
        }
      },
    }
    const efeitos = await efeitosPara('2026-12-30', '2027-01-02', servico)

    expect(consultas.sort()).toEqual([2026, 2027])
    // 31/12 e 02/01 contam; 01/01 é feriado.
    expect(efeitos).toEqual({ valorMulta: 40, manutencao: true })
  })

  it('indisponibilidade dos feriados não bloqueia: desconta apenas domingos', async () => {
    process.env.MULTA_DIARIA_VALOR = '20'
    const efeitos = await efeitosPara('2026-01-10', '2026-01-13', feriadosIndisponiveis)

    expect(efeitos).toEqual({ valorMulta: 40, manutencao: true })
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
