import { describe, expect, it, vi } from 'vitest'
import type { Equipamento } from '../../shared/contratos/modelos'
import type { RepositorioEquipamentos } from '../repositorios/EquipamentoRepositorio'
import type { RepositorioReservas } from '../repositorios/ReservaRepositorio'
import { DisponibilidadeServico } from './DisponibilidadeServico'

const PERIODO = {
  inicio: '2026-12-01T00:00:00.000Z',
  fim: '2026-12-05T00:00:00.000Z',
}

const tenda: Equipamento = {
  id: 1,
  nome: 'Tenda',
  categoriaId: 1,
  precoDiaria: 80,
  valorAquisicao: 900,
  estado: 'disponivel',
  ativo: true,
  descricao: null,
}

const mochila: Equipamento = {
  ...tenda,
  id: 2,
  nome: 'Mochila',
}

function equipamentosFalso(itens: readonly Equipamento[] = [tenda]): RepositorioEquipamentos {
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

function reservasFalso(sobrepostos: readonly number[] = []) {
  const existeSobreposicao = vi.fn(
    (equipamentoId: number, _inicio: string, _fim: string) =>
      sobrepostos.includes(equipamentoId),
  )
  const repositorio: RepositorioReservas = { existeSobreposicao }
  return { repositorio, existeSobreposicao }
}

describe('DisponibilidadeServico', () => {
  it('devolve EQUIPAMENTO_NAO_ENCONTRADO sem consultar reservas', () => {
    const { repositorio, existeSobreposicao } = reservasFalso()
    const servico = new DisponibilidadeServico(repositorio, equipamentosFalso([]))

    expect(servico.verificar({ equipamentoId: 9, ...PERIODO })).toEqual({
      disponivel: false,
      motivo: 'EQUIPAMENTO_NAO_ENCONTRADO',
    })
    expect(existeSobreposicao).not.toHaveBeenCalled()
  })

  it('devolve PERIODO_INVALIDO sem consultar reservas', () => {
    const { repositorio, existeSobreposicao } = reservasFalso()
    const servico = new DisponibilidadeServico(repositorio, equipamentosFalso())

    expect(
      servico.verificar({ equipamentoId: 1, inicio: PERIODO.fim, fim: PERIODO.inicio }),
    ).toEqual({ disponivel: false, motivo: 'PERIODO_INVALIDO' })
    expect(existeSobreposicao).not.toHaveBeenCalled()
  })

  it('devolve ITEM_INDISPONIVEL quando há sobreposição', () => {
    const { repositorio, existeSobreposicao } = reservasFalso([1])
    const servico = new DisponibilidadeServico(repositorio, equipamentosFalso())

    expect(servico.verificar({ equipamentoId: 1, ...PERIODO })).toEqual({
      disponivel: false,
      motivo: 'ITEM_INDISPONIVEL',
    })
    expect(existeSobreposicao).toHaveBeenCalledWith(1, PERIODO.inicio, PERIODO.fim)
  })

  it('devolve disponível quando não há equipamento inexistente, período invertido ou reserva', () => {
    const { repositorio } = reservasFalso()
    const servico = new DisponibilidadeServico(repositorio, equipamentosFalso())

    expect(servico.verificar({ equipamentoId: 1, ...PERIODO })).toEqual({ disponivel: true })
  })

  it('filtra apenas os equipamentos com sobreposição', () => {
    const { repositorio, existeSobreposicao } = reservasFalso([1])
    const servico = new DisponibilidadeServico(repositorio, equipamentosFalso([tenda, mochila]))

    expect(servico.filtrar([tenda, mochila], PERIODO).map((item) => item.id)).toEqual([2])
    expect(existeSobreposicao).toHaveBeenNthCalledWith(1, 1, PERIODO.inicio, PERIODO.fim)
    expect(existeSobreposicao).toHaveBeenNthCalledWith(2, 2, PERIODO.inicio, PERIODO.fim)
  })

  it('não filtra nada quando o período está invertido', () => {
    const { repositorio, existeSobreposicao } = reservasFalso([1])
    const servico = new DisponibilidadeServico(repositorio, equipamentosFalso())

    expect(servico.filtrar([tenda], { inicio: PERIODO.fim, fim: PERIODO.inicio })).toEqual([])
    expect(existeSobreposicao).not.toHaveBeenCalled()
  })
})
