import { describe, expect, it } from 'vitest'
import type { Cliente, Reserva } from '../../shared/contratos/modelos'
import type { RepositorioClientes, RepositorioReservas } from '../repositorios/portas'
import { ReservaServico } from './ReservaServico'
import type { ServicoClima, ServicoDisponibilidade, ServicoFeriados } from './portas'

const ATUALIZADO = '2026-01-01T00:00:00.000Z'
const INICIO = '2026-02-16'

function reserva(): Reserva {
  return {
    id: 1,
    clienteId: 2,
    dataReserva: '2026-01-01T10:00:00.000Z',
    dataInicio: INICIO,
    dataFim: '2026-02-18',
    statusReserva: 'Pendente',
    previsaoTempo: null,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function repositorioReservas(): RepositorioReservas {
  const atual = reserva()
  return {
    listar: async () => [atual],
    buscarPorId: async () => atual,
    criar: async () => atual,
    atualizar: async (dados) => ({
      ...atual,
      statusReserva: dados.statusReserva ?? atual.statusReserva,
      previsaoTempo:
        dados.previsaoTempo === undefined
          ? atual.previsaoTempo
          : (dados.previsaoTempo ?? null),
    }),
    inativar: async () => true,
  }
}

function repositorioClientes(): RepositorioClientes {
  const cliente: Cliente = {
    id: 2,
    nome: 'Ana',
    cpf: '00000000000',
    telefone: null,
    email: null,
    cep: null,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    uf: null,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
  return {
    listar: async () => [cliente],
    buscarPorId: async () => cliente,
    criar: async () => cliente,
    atualizar: async () => cliente,
    inativar: async () => true,
    cpfEmUso: async () => false,
  }
}

function disponibilidade(): ServicoDisponibilidade {
  return {
    listarDisponiveis: async () => [],
    validarItens: async () => undefined,
  }
}

function clima(texto: string, altaDemanda: boolean | null): ServicoClima {
  return { resumo: async () => texto, altaDemanda: async () => altaDemanda }
}

function feriados(
  datas: readonly string[] = [],
  indisponivel = false,
): ServicoFeriados {
  return {
    feriados: async (ano) =>
      indisponivel
        ? { estado: 'indisponivel', ano, motivo: 'SERVICO_FORA', feriados: [] }
        : {
            estado: 'disponivel',
            ano,
            feriados: datas.map((data) => ({ data, nome: 'Feriado nacional' })),
          },
  }
}

function servico(climaServico: ServicoClima, feriadosServico: ServicoFeriados): ReservaServico {
  return new ReservaServico(
    repositorioReservas(),
    repositorioClientes(),
    disponibilidade(),
    climaServico,
    feriadosServico,
  )
}

describe('ReservaServico — efeito real da integração na confirmação', () => {
  it('sinaliza alta demanda pelo clima e grava o aviso na previsão', async () => {
    const confirmada = await servico(
      clima('Previsão para 2026-02-16: Céu limpo.', true),
      feriados(),
    ).atualizar({ id: 1, statusReserva: 'Confirmada' })

    expect(confirmada.statusReserva).toBe('Confirmada')
    expect(confirmada.altaDemandaPrevista).toBe(true)
    expect(confirmada.previsaoTempo).toContain('Alta demanda prevista para esta data.')
  })

  it('confirma sem previsão e sem erro quando clima e feriados estão indisponíveis', async () => {
    const confirmada = await servico(
      clima('Previsão indisponível para 2026-02-16.', null),
      feriados([], true),
    ).atualizar({ id: 1, statusReserva: 'Confirmada' })

    expect(confirmada.statusReserva).toBe('Confirmada')
    expect(confirmada.previsaoTempo).toBe('Previsão indisponível para 2026-02-16.')
    expect(confirmada.altaDemandaPrevista).toBeNull()
  })

  it('sinaliza alta demanda quando a data de início é feriado, mesmo com clima desfavorável', async () => {
    const confirmada = await servico(
      clima('Previsão para 2026-02-16: Chuva.', false),
      feriados([INICIO]),
    ).atualizar({ id: 1, statusReserva: 'Confirmada' })

    expect(confirmada.altaDemandaPrevista).toBe(true)
    expect(confirmada.previsaoTempo).toContain('Alta demanda prevista para esta data.')
  })

  it('mantém compatibilidade com colaborador de clima sem consulta rica', async () => {
    const legado: ServicoClima = { resumo: async () => 'Previsão legada.' }
    const confirmada = await servico(legado, feriados([], true)).atualizar({
      id: 1,
      statusReserva: 'Confirmada',
    })

    expect(confirmada.statusReserva).toBe('Confirmada')
    expect('altaDemandaPrevista' in confirmada).toBe(false)
  })
})
