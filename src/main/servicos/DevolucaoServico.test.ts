import { describe, expect, it, vi } from 'vitest'
import type {
  CalculoMulta,
  CodigoErroDominio,
  Devolucao,
  Equipamento,
  Reserva,
  StatusReserva,
} from '../../shared/contratos/modelos'
import type { RepositorioDevolucoes } from '../repositorios/DevolucaoRepositorio'
import type { RepositorioEquipamentos } from '../repositorios/EquipamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'
import { DevolucaoServico } from './DevolucaoServico'
import { ErroDeDominio } from './ErroDominio'
import type { ParametrosCalculoMulta, ServicoMulta } from './MultaServico'

const INICIO = '2026-12-01T00:00:00.000Z'
const FIM = '2026-12-05T00:00:00.000Z'
const DEVOLVIDO = '2026-12-15T12:00:00.000Z'
const ENTRADA = { reservaId: 7, devolvidoEm: DEVOLVIDO, observacoes: 'Atraso na entrega' }

const CALCULO: CalculoMulta = {
  diasAtraso: 10,
  diasCarencia: 90,
  valorDiaria: 80,
  valorLocacao: 320,
  baseCalculo: 1000,
  percentualDiario: 0.005,
  valorMultaBruta: 50,
  valorMulta: 50,
  valorTotal: 370,
  tetoAplicado: false,
}

const DEVOLUCAO: Devolucao = {
  id: 55,
  reservaId: 7,
  devolvidoEm: DEVOLVIDO,
  observacoes: 'Atraso na entrega',
  diasAtraso: 10,
  valorDiaria: 80,
  valorMulta: 50,
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

function equipamento(valorAquisicao = 1000): Equipamento {
  return {
    id: 3,
    nome: 'Tenda',
    categoriaId: 1,
    precoDiaria: 80,
    valorAquisicao,
    estado: 'disponivel',
    ativo: true,
    descricao: null,
  }
}

function devolucoesFalso(existente: Devolucao | null = null) {
  const criar = vi.fn((dados: Omit<Devolucao, 'id'>): Devolucao => ({ id: 55, ...dados }))
  const buscarPorReserva = vi.fn((_reservaId: number): Devolucao | null => existente)
  const existeParaReserva = vi.fn((_reservaId: number): boolean => existente !== null)
  const repositorio: RepositorioDevolucoes = { criar, buscarPorReserva, existeParaReserva }
  return { repositorio, criar, buscarPorReserva, existeParaReserva }
}

function reservasFalso(encontrada: Reserva | null = reserva()) {
  const buscarPorId = vi.fn((_id: number): Reserva | null => encontrada)
  const concluir = vi.fn((_id: number): boolean => true)
  const repositorio: RepositorioReservas = {
    listar: () => [],
    buscarPorId,
    criar: () => reserva(),
    confirmar: () => reserva('confirmada'),
    cancelar: () => true,
    concluir,
    existeSobreposicao: () => false,
  }
  return { repositorio, buscarPorId, concluir }
}

function equipamentosFalso(encontrado: Equipamento | null = equipamento()) {
  const buscarPorId = vi.fn((_id: number): Equipamento | null => encontrado)
  const repositorio: RepositorioEquipamentos = {
    listar: () => [],
    buscarPorId,
    criar: () => {
      throw new Error('NAO_ESPERADO')
    },
    atualizar: () => null,
    inativar: () => false,
    listarDisponiveis: () => [],
    nomeEmUso: () => false,
  }
  return { repositorio, buscarPorId }
}

function multasFalso() {
  const calcular = vi.fn((_params: ParametrosCalculoMulta): CalculoMulta => CALCULO)
  const servico: ServicoMulta = { calcular }
  return { servico, calcular }
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

describe('DevolucaoServico', () => {
  it('calcula a partir da reserva e do equipamento sem persistir', () => {
    const devolucoes = devolucoesFalso()
    const reservas = reservasFalso()
    const equipamentos = equipamentosFalso()
    const multas = multasFalso()
    const servico = new DevolucaoServico(
      devolucoes.repositorio,
      reservas.repositorio,
      equipamentos.repositorio,
      multas.servico,
    )

    expect(servico.calcular({ reservaId: 7, devolvidoEm: DEVOLVIDO })).toBe(CALCULO)
    expect(multas.calcular).toHaveBeenCalledWith({
      fim: FIM,
      devolvidoEm: DEVOLVIDO,
      valorAquisicao: 1000,
      precoDiaria: 80,
      diasReserva: 4,
    })
    expect(devolucoes.criar).not.toHaveBeenCalled()
    expect(reservas.concluir).not.toHaveBeenCalled()
  })

  it('rejeita reserva inexistente antes de calcular', () => {
    const multas = multasFalso()
    const servico = new DevolucaoServico(
      devolucoesFalso().repositorio,
      reservasFalso(null).repositorio,
      equipamentosFalso().repositorio,
      multas.servico,
    )

    expect(
      codigoDaRejeicao(() => servico.calcular({ reservaId: 404, devolvidoEm: DEVOLVIDO })),
    ).toBe('RESERVA_NAO_ENCONTRADA')
    expect(multas.calcular).not.toHaveBeenCalled()
  })

  it('rejeita devolução anterior ao início da reserva', () => {
    const multas = multasFalso()
    const servico = new DevolucaoServico(
      devolucoesFalso().repositorio,
      reservasFalso().repositorio,
      equipamentosFalso().repositorio,
      multas.servico,
    )

    expect(
      codigoDaRejeicao(() =>
        servico.calcular({ reservaId: 7, devolvidoEm: '2026-11-30T00:00:00.000Z' }),
      ),
    ).toBe('DEVOLUCAO_DATA_INVALIDA')
    expect(multas.calcular).not.toHaveBeenCalled()
  })

  it('exige valor de aquisição como base da multa', () => {
    const multas = multasFalso()
    const servico = new DevolucaoServico(
      devolucoesFalso().repositorio,
      reservasFalso().repositorio,
      equipamentosFalso(equipamento(0)).repositorio,
      multas.servico,
    )

    expect(
      codigoDaRejeicao(() => servico.calcular({ reservaId: 7, devolvidoEm: DEVOLVIDO })),
    ).toBe('MULTA_BASE_INDISPONIVEL')
    expect(multas.calcular).not.toHaveBeenCalled()
  })

  it('registra o cálculo e conclui a reserva confirmada', () => {
    const devolucoes = devolucoesFalso()
    const reservas = reservasFalso()
    const servico = new DevolucaoServico(
      devolucoes.repositorio,
      reservas.repositorio,
      equipamentosFalso().repositorio,
      multasFalso().servico,
    )

    expect(servico.registrar(ENTRADA)).toEqual(DEVOLUCAO)
    expect(devolucoes.criar).toHaveBeenCalledWith({
      reservaId: 7,
      devolvidoEm: DEVOLVIDO,
      observacoes: 'Atraso na entrega',
      diasAtraso: 10,
      valorDiaria: 80,
      valorMulta: 50,
    })
    expect(reservas.concluir).toHaveBeenCalledWith(7)
  })

  it('normaliza observações ausentes para null', () => {
    const devolucoes = devolucoesFalso()
    const servico = new DevolucaoServico(
      devolucoes.repositorio,
      reservasFalso().repositorio,
      equipamentosFalso().repositorio,
      multasFalso().servico,
    )

    servico.registrar({ reservaId: 7, devolvidoEm: DEVOLVIDO })

    expect(devolucoes.criar).toHaveBeenCalledWith(
      expect.objectContaining({ reservaId: 7, observacoes: null }),
    )
  })

  it('rejeita devolução repetida sem gravar nada', () => {
    const devolucoes = devolucoesFalso(DEVOLUCAO)
    const reservas = reservasFalso()
    const servico = new DevolucaoServico(
      devolucoes.repositorio,
      reservas.repositorio,
      equipamentosFalso().repositorio,
      multasFalso().servico,
    )

    expect(codigoDaRejeicao(() => servico.registrar(ENTRADA))).toBe('DEVOLUCAO_JA_REGISTRADA')
    expect(devolucoes.criar).not.toHaveBeenCalled()
    expect(reservas.concluir).not.toHaveBeenCalled()
  })

  it('só registra devolução de reserva confirmada', () => {
    for (const status of ['pendente', 'cancelada', 'concluida'] as const) {
      const devolucoes = devolucoesFalso()
      const reservas = reservasFalso(reserva(status))
      const servico = new DevolucaoServico(
        devolucoes.repositorio,
        reservas.repositorio,
        equipamentosFalso().repositorio,
        multasFalso().servico,
      )

      expect(codigoDaRejeicao(() => servico.registrar(ENTRADA))).toBe('RESERVA_NAO_CONFIRMADA')
      expect(devolucoes.criar).not.toHaveBeenCalled()
      expect(reservas.concluir).not.toHaveBeenCalled()
    }
  })

  it('busca devolução existente pela reserva', () => {
    const devolucoes = devolucoesFalso(DEVOLUCAO)
    const reservas = reservasFalso()
    const servico = new DevolucaoServico(
      devolucoes.repositorio,
      reservas.repositorio,
      equipamentosFalso().repositorio,
      multasFalso().servico,
    )

    expect(servico.buscarPorReserva(7)).toEqual(DEVOLUCAO)
    expect(devolucoes.buscarPorReserva).toHaveBeenCalledWith(7)
    expect(reservas.buscarPorId).not.toHaveBeenCalled()
  })

  it('devolve RESERVA_NAO_ENCONTRADA quando não há devolução', () => {
    const servico = new DevolucaoServico(
      devolucoesFalso().repositorio,
      reservasFalso().repositorio,
      equipamentosFalso().repositorio,
      multasFalso().servico,
    )

    expect(codigoDaRejeicao(() => servico.buscarPorReserva(404))).toBe('RESERVA_NAO_ENCONTRADA')
  })
})
