import { describe, expect, it, vi } from 'vitest'
import type {
  Cliente,
  CodigoErroDominio,
  Equipamento,
  Reserva,
  ReservaCriarEntrada,
  ReservasListarFiltros,
  StatusReserva,
} from '../../shared/contratos/modelos'
import type { RepositorioClientes } from '../repositorios/ClienteRepositorio'
import type { RepositorioEquipamentos } from '../repositorios/EquipamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'
import type { DisponibilidadeResultado } from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'
import { ReservaServico } from './ReservaServico'

const INICIO = '2026-12-01T00:00:00.000Z'
const FIM = '2026-12-05T00:00:00.000Z'

const cliente: Cliente = {
  id: 1,
  nome: 'Ana',
  email: null,
  telefone: null,
  cep: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  ativo: true,
}

const equipamento: Equipamento = {
  id: 1,
  nome: 'Tenda',
  categoriaId: 1,
  precoDiaria: 80,
  valorAquisicao: 900,
  estado: 'disponivel',
  ativo: true,
  descricao: null,
}

const entidade: ReservaCriarEntrada = {
  clienteId: 1,
  equipamentoId: 1,
  inicio: INICIO,
  fim: FIM,
  localAtividade: 'Serra da Mantiqueira',
}

function reserva(status: StatusReserva = 'pendente'): Reserva {
  return {
    id: 10,
    clienteId: 1,
    equipamentoId: 1,
    inicio: INICIO,
    fim: FIM,
    status,
    localAtividade: 'Serra da Mantiqueira',
    criadoEm: '2026-11-23 10:00:00',
  }
}

function repositorioFalso(itens: readonly Reserva[] = [reserva()]) {
  const listar = vi.fn((_filtros?: ReservasListarFiltros): Reserva[] => [...itens])
  const buscarPorId = vi.fn((id: number): Reserva | null => itens.find((item) => item.id === id) ?? null)
  const criar = vi.fn((dados: ReservaCriarEntrada): Reserva => ({
    ...reserva(),
    ...dados,
    id: 99,
  }))
  const confirmar = vi.fn((id: number): Reserva | null => {
    const encontrada = itens.find((item) => item.id === id)
    return encontrada ? { ...encontrada, status: 'confirmada' } : null
  })
  const cancelar = vi.fn((_id: number): boolean => true)
  const repositorio: RepositorioReservas = {
    listar,
    buscarPorId,
    criar,
    confirmar,
    cancelar,
    concluir: () => false,
    existeSobreposicao: () => false,
  }
  return { repositorio, listar, buscarPorId, criar, confirmar, cancelar }
}

function clientesFalsos(itens: readonly Cliente[] = [cliente]): RepositorioClientes {
  return {
    listar: () => [...itens],
    buscarPorId: (id) => itens.find((item) => item.id === id) ?? null,
    criar: () => {
      throw new Error('NAO_ESPERADO')
    },
    atualizar: () => null,
    inativar: () => false,
    emailEmUso: () => false,
  }
}

function equipamentosFalsos(itens: readonly Equipamento[] = [equipamento]): RepositorioEquipamentos {
  return {
    listar: () => [...itens],
    buscarPorId: (id) => itens.find((item) => item.id === id) ?? null,
    criar: () => {
      throw new Error('NAO_ESPERADO')
    },
    atualizar: () => null,
    inativar: () => false,
    listarDisponiveis: () => [...itens],
    nomeEmUso: () => false,
  }
}

function disponibilidadeFalsa(resultado: DisponibilidadeResultado = { disponivel: true }) {
  const verificar = vi.fn((_entrada: {
    equipamentoId: number
    inicio: string
    fim: string
  }): DisponibilidadeResultado => resultado)
  return { servico: { verificar }, verificar }
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

describe('ReservaServico', () => {
  it('cria depois de validar cliente, equipamento e disponibilidade', () => {
    const repositorio = repositorioFalso([])
    const disponibilidade = disponibilidadeFalsa()

    const servico = new ReservaServico(
      repositorio.repositorio,
      clientesFalsos(),
      equipamentosFalsos(),
      disponibilidade.servico,
    )
    const criada = servico.criar(entidade)

    expect(criada).toMatchObject({ inicio: INICIO, fim: FIM, localAtividade: entidade.localAtividade })
    expect(disponibilidade.verificar).toHaveBeenCalledWith({
      equipamentoId: 1,
      inicio: INICIO,
      fim: FIM,
    })
    expect(repositorio.criar).toHaveBeenCalledWith(entidade)
  })

  it('rejeita período invertido sem consultar ninguém', () => {
    const repositorio = repositorioFalso([])
    const disponibilidade = disponibilidadeFalsa()

    const servico = new ReservaServico(
      repositorio.repositorio,
      clientesFalsos(),
      equipamentosFalsos(),
      disponibilidade.servico,
    )

    expect(
      codigoDaRejeicao(() => servico.criar({ ...entidade, inicio: FIM, fim: INICIO })),
    ).toBe('PERIODO_INVALIDO')
    expect(disponibilidade.verificar).not.toHaveBeenCalled()
    expect(repositorio.criar).not.toHaveBeenCalled()
  })

  it('rejeita cliente inexistente ou inativo', () => {
    const repositorio = repositorioFalso([])
    const disponibilidade = disponibilidadeFalsa()

    expect(
      codigoDaRejeicao(
        () =>
          new ReservaServico(
            repositorio.repositorio,
            clientesFalsos([]),
            equipamentosFalsos(),
            disponibilidade.servico,
          ).criar(entidade),
      ),
    ).toBe('CLIENTE_NAO_ENCONTRADO')
    expect(
      codigoDaRejeicao(
        () =>
          new ReservaServico(
            repositorio.repositorio,
            clientesFalsos([{ ...cliente, ativo: false }]),
            equipamentosFalsos(),
            disponibilidade.servico,
          ).criar(entidade),
      ),
    ).toBe('CLIENTE_NAO_ENCONTRADO')
    expect(disponibilidade.verificar).not.toHaveBeenCalled()
  })

  it('rejeita equipamento inexistente ou inativo', () => {
    const repositorio = repositorioFalso([])
    const disponibilidade = disponibilidadeFalsa()

    expect(
      codigoDaRejeicao(
        () =>
          new ReservaServico(
            repositorio.repositorio,
            clientesFalsos(),
            equipamentosFalsos([]),
            disponibilidade.servico,
          ).criar(entidade),
      ),
    ).toBe('EQUIPAMENTO_NAO_ENCONTRADO')
    expect(
      codigoDaRejeicao(
        () =>
          new ReservaServico(
            repositorio.repositorio,
            clientesFalsos(),
            equipamentosFalsos([{ ...equipamento, ativo: false }]),
            disponibilidade.servico,
          ).criar(entidade),
      ),
    ).toBe('EQUIPAMENTO_NAO_ENCONTRADO')
    expect(disponibilidade.verificar).not.toHaveBeenCalled()
  })

  it('não grava reserva quando o item está indisponível', () => {
    const repositorio = repositorioFalso([])
    const disponibilidade = disponibilidadeFalsa({
      disponivel: false,
      motivo: 'ITEM_INDISPONIVEL',
    })
    const servico = new ReservaServico(
      repositorio.repositorio,
      clientesFalsos(),
      equipamentosFalsos(),
      disponibilidade.servico,
    )

    expect(codigoDaRejeicao(() => servico.criar(entidade))).toBe('ITEM_INDISPONIVEL')
    expect(repositorio.criar).not.toHaveBeenCalled()
  })

  it('lista delegando os filtros ao repositório', () => {
    const repositorio = repositorioFalso()
    const servico = new ReservaServico(
      repositorio.repositorio,
      clientesFalsos(),
      equipamentosFalsos(),
      disponibilidadeFalsa().servico,
    )
    const filtros: ReservasListarFiltros = { status: 'pendente', clienteId: 1 }

    expect(servico.listar(filtros)).toHaveLength(1)
    expect(repositorio.listar).toHaveBeenCalledWith(filtros)
  })

  it('devolve RESERVA_NAO_ENCONTRADA para id ausente', () => {
    const repositorio = repositorioFalso([])
    const servico = new ReservaServico(
      repositorio.repositorio,
      clientesFalsos(),
      equipamentosFalsos(),
      disponibilidadeFalsa().servico,
    )

    expect(codigoDaRejeicao(() => servico.buscarPorId(404))).toBe('RESERVA_NAO_ENCONTRADA')
  })

  it('confirma somente reserva pendente', () => {
    const repositorio = repositorioFalso()
    const servico = new ReservaServico(
      repositorio.repositorio,
      clientesFalsos(),
      equipamentosFalsos(),
      disponibilidadeFalsa().servico,
    )

    expect(servico.confirmar(10).status).toBe('confirmada')
    expect(repositorio.confirmar).toHaveBeenCalledWith(10)
  })

  it('rejeita confirmação de status já encerrado', () => {
    for (const status of ['confirmada', 'cancelada', 'concluida'] as const) {
      const repositorio = repositorioFalso([reserva(status)])
      const servico = new ReservaServico(
        repositorio.repositorio,
        clientesFalsos(),
        equipamentosFalsos(),
        disponibilidadeFalsa().servico,
      )

      expect(codigoDaRejeicao(() => servico.confirmar(10))).toBe('RESERVA_JA_CONFIRMADA')
      expect(repositorio.confirmar).not.toHaveBeenCalled()
    }
  })

  it('cancela reservas pendentes e confirmadas', () => {
    for (const status of ['pendente', 'confirmada'] as const) {
      const repositorio = repositorioFalso([reserva(status)])
      const servico = new ReservaServico(
        repositorio.repositorio,
        clientesFalsos(),
        equipamentosFalsos(),
        disponibilidadeFalsa().servico,
      )

      expect(() => servico.cancelar(10)).not.toThrow()
      expect(repositorio.cancelar).toHaveBeenCalledWith(10)
    }
  })

  it('não cancela status terminais', () => {
    for (const status of ['cancelada', 'concluida'] as const) {
      const repositorio = repositorioFalso([reserva(status)])
      const servico = new ReservaServico(
        repositorio.repositorio,
        clientesFalsos(),
        equipamentosFalsos(),
        disponibilidadeFalsa().servico,
      )

      expect(codigoDaRejeicao(() => servico.cancelar(10))).toBe('RESERVA_JA_CANCELADA')
      expect(repositorio.cancelar).not.toHaveBeenCalled()
    }
  })
})
