import type { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { StatusReserva } from '../../shared/contratos/modelos'
import { ConexaoBanco } from '../banco/ConexaoBanco'
import { Migrador } from '../banco/Migrador'
import { MIGRACOES } from '../banco/migracoes'
import { ReservaRepositorio } from './ReservaRepositorio'

const INICIO = '2026-12-01T00:00:00.000Z'
const FIM = '2026-12-05T00:00:00.000Z'

function bancoComMigracoes(): ConexaoBanco {
  const conexao = new ConexaoBanco(':memory:')
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()

  const inserirEquipamento = conexao.db.prepare(`
    INSERT INTO equipamentos (nome, categoria_id, preco_diaria, valor_aquisicao)
    VALUES (?, ?, ?, ?)
  `)
  inserirEquipamento.run('Tenda', 1, 80, 900)
  inserirEquipamento.run('Mochila', 1, 50, 300)
  conexao.db.prepare('INSERT INTO clientes (nome) VALUES (?)').run('Ana')

  return conexao
}

function inserirReserva(
  db: DatabaseSync,
  dados: {
    inicio: string
    fim: string
    equipamentoId?: number
    clienteId?: number
    status?: StatusReserva
    localAtividade?: string
  },
): void {
  db.prepare(`
    INSERT INTO reservas (cliente_id, equipamento_id, inicio, fim, status, local_atividade)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    dados.clienteId ?? 1,
    dados.equipamentoId ?? 1,
    dados.inicio,
    dados.fim,
    dados.status ?? 'pendente',
    dados.localAtividade ?? 'Trilha da Serra',
  )
}

describe('ReservaRepositorio', () => {
  it('detecta sobreposição de reserva pendente ou confirmada', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)

    inserirReserva(conexao.db, {
      inicio: '2026-11-28T00:00:00.000Z',
      fim: '2026-12-02T00:00:00.000Z',
    })
    expect(repositorio.existeSobreposicao(1, INICIO, FIM)).toBe(true)

    inserirReserva(conexao.db, {
      inicio: '2026-12-03T00:00:00.000Z',
      fim: '2026-12-04T00:00:00.000Z',
      status: 'confirmada',
    })
    expect(repositorio.existeSobreposicao(1, INICIO, FIM)).toBe(true)

    conexao.fechar()
  })

  it('ignora reservas fora do período, nos limites e de outro equipamento', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)

    inserirReserva(conexao.db, {
      inicio: '2026-11-25T00:00:00.000Z',
      fim: INICIO,
    })
    inserirReserva(conexao.db, {
      inicio: FIM,
      fim: '2026-12-10T00:00:00.000Z',
    })
    inserirReserva(conexao.db, {
      inicio: '2026-12-02T00:00:00.000Z',
      fim: '2026-12-03T00:00:00.000Z',
      equipamentoId: 2,
    })

    expect(repositorio.existeSobreposicao(1, INICIO, FIM)).toBe(false)
    expect(repositorio.existeSobreposicao(2, INICIO, FIM)).toBe(true)

    conexao.fechar()
  })

  it('não conta reservas canceladas nem concluídas', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)

    inserirReserva(conexao.db, {
      inicio: '2026-12-02T00:00:00.000Z',
      fim: '2026-12-03T00:00:00.000Z',
      status: 'cancelada',
    })
    inserirReserva(conexao.db, {
      inicio: '2026-12-03T00:00:00.000Z',
      fim: '2026-12-04T00:00:00.000Z',
      status: 'concluida',
    })

    expect(repositorio.existeSobreposicao(1, INICIO, FIM)).toBe(false)

    conexao.fechar()
  })

  it('lista todas as reservas ordenadas por início descendente', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)

    inserirReserva(conexao.db, {
      inicio: '2026-12-02T00:00:00.000Z',
      fim: '2026-12-03T00:00:00.000Z',
    })
    inserirReserva(conexao.db, { inicio: FIM, fim: '2026-12-08T00:00:00.000Z' })
    inserirReserva(conexao.db, {
      inicio: '2026-11-25T00:00:00.000Z',
      fim: '2026-11-26T00:00:00.000Z',
    })

    expect(repositorio.listar().map((reserva) => reserva.inicio)).toEqual([
      FIM,
      '2026-12-02T00:00:00.000Z',
      '2026-11-25T00:00:00.000Z',
    ])

    conexao.fechar()
  })

  it('aplica filtros opcionais de cliente, equipamento e status', () => {
    const conexao = bancoComMigracoes()
    conexao.db.prepare('INSERT INTO clientes (nome) VALUES (?)').run('Bruno')
    const repositorio = new ReservaRepositorio(conexao.db)

    inserirReserva(conexao.db, { inicio: INICIO, fim: FIM })
    inserirReserva(conexao.db, {
      clienteId: 2,
      equipamentoId: 2,
      inicio: '2026-12-06T00:00:00.000Z',
      fim: '2026-12-08T00:00:00.000Z',
      status: 'confirmada',
    })

    expect(repositorio.listar({ clienteId: 2 })).toHaveLength(1)
    expect(repositorio.listar({ equipamentoId: 2 })).toHaveLength(1)
    expect(repositorio.listar({ status: 'confirmada' })).toHaveLength(1)
    expect(repositorio.listar({ clienteId: 1, status: 'confirmada' })).toEqual([])
    expect(repositorio.listar({ clienteId: 2, equipamentoId: 2, status: 'confirmada' })).toHaveLength(
      1,
    )

    conexao.fechar()
  })

  it('busca por id e devolve null quando não encontra', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)
    const criado = repositorio.criar({
      clienteId: 1,
      equipamentoId: 2,
      inicio: INICIO,
      fim: FIM,
      localAtividade: 'Serra da Mantiqueira',
    })

    expect(repositorio.buscarPorId(criado.id)).toEqual(criado)
    expect(repositorio.buscarPorId(999)).toBeNull()

    conexao.fechar()
  })

  it('cria como pendente e grava o local da atividade', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)

    const criado = repositorio.criar({
      clienteId: 1,
      equipamentoId: 2,
      inicio: INICIO,
      fim: FIM,
      localAtividade: 'Serra da Mantiqueira',
    })

    expect(criado).toMatchObject({
      clienteId: 1,
      equipamentoId: 2,
      inicio: INICIO,
      fim: FIM,
      status: 'pendente',
      localAtividade: 'Serra da Mantiqueira',
    })
    expect(typeof criado.criadoEm).toBe('string')

    conexao.fechar()
  })

  it('confirma e cancela com retorno de linha ausente quando o id não existe', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)
    const criado = repositorio.criar({
      clienteId: 1,
      equipamentoId: 1,
      inicio: INICIO,
      fim: FIM,
      localAtividade: 'Trilha da Serra',
    })

    expect(repositorio.confirmar(criado.id)?.status).toBe('confirmada')
    expect(repositorio.cancelar(criado.id)).toBe(true)
    expect(repositorio.buscarPorId(criado.id)?.status).toBe('cancelada')
    expect(repositorio.confirmar(999)).toBeNull()
    expect(repositorio.cancelar(999)).toBe(false)

    conexao.fechar()
  })

  it('conclui somente reservas pendentes ou confirmadas', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ReservaRepositorio(conexao.db)

    inserirReserva(conexao.db, {
      inicio: INICIO,
      fim: FIM,
      status: 'confirmada',
    })
    inserirReserva(conexao.db, {
      inicio: '2026-12-06T00:00:00.000Z',
      fim: '2026-12-08T00:00:00.000Z',
      status: 'cancelada',
    })

    expect(repositorio.concluir(1)).toBe(true)
    expect(repositorio.buscarPorId(1)?.status).toBe('concluida')
    expect(repositorio.concluir(2)).toBe(false)
    expect(repositorio.buscarPorId(2)?.status).toBe('cancelada')
    expect(repositorio.concluir(999)).toBe(false)

    conexao.fechar()
  })
})
