import type { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { FormaPagamento, StatusPagamento } from '../../shared/contratos/modelos'
import { ConexaoBanco } from '../banco/ConexaoBanco'
import { Migrador } from '../banco/Migrador'
import { MIGRACOES } from '../banco/migracoes'
import { PagamentoRepositorio } from './PagamentoRepositorio'

const INICIO = '2026-12-01T00:00:00.000Z'
const FIM = '2026-12-05T00:00:00.000Z'

function bancoComReservas(quantidade = 1): ConexaoBanco {
  const conexao = new ConexaoBanco(':memory:')
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()

  conexao.db
    .prepare(
      `
      INSERT INTO equipamentos (nome, categoria_id, preco_diaria, valor_aquisicao)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run('Tenda', 1, 80, 900)
  conexao.db.prepare('INSERT INTO clientes (nome) VALUES (?)').run('Ana')

  const inserir = conexao.db.prepare(`
    INSERT INTO reservas (cliente_id, equipamento_id, inicio, fim, status)
    VALUES (?, ?, ?, ?, 'confirmada')
  `)
  for (let indice = 0; indice < quantidade; indice += 1) {
    inserir.run(1, 1, INICIO, FIM)
  }
  return conexao
}

function inserirPagamento(
  db: DatabaseSync,
  dados: {
    reservaId: number
    valor: number
    forma: FormaPagamento
    status: StatusPagamento
    criadoEm: string
    pagoEm?: string | null
  },
): void {
  db.prepare(
    `
    INSERT INTO pagamentos (reserva_id, valor, forma, status, pago_em, criado_em)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    dados.reservaId,
    dados.valor,
    dados.forma,
    dados.status,
    dados.pagoEm ?? null,
    dados.criadoEm,
  )
}

describe('PagamentoRepositorio', () => {
  it('cria pendente com pagoEm nulo e localiza por id e por reserva', () => {
    const conexao = bancoComReservas()
    const repositorio = new PagamentoRepositorio(conexao.db)

    const criado = repositorio.criar({ reservaId: 1, valor: 370, forma: 'pix' })

    expect(criado).toEqual({
      id: expect.any(Number),
      reservaId: 1,
      valor: 370,
      forma: 'pix',
      status: 'pendente',
      pagoEm: null,
      criadoEm: expect.any(String),
    })
    expect(repositorio.buscarPorId(criado.id)).toEqual(criado)
    expect(repositorio.buscarPorReserva(1)).toEqual(criado)
    expect(repositorio.existeParaReserva(1)).toBe(true)
    expect(repositorio.existeParaReserva(404)).toBe(false)

    conexao.fechar()
  })

  it('lista por criado_em DESC com filtros opcionais', () => {
    const conexao = bancoComReservas(3)
    const repositorio = new PagamentoRepositorio(conexao.db)
    inserirPagamento(conexao.db, {
      reservaId: 1,
      valor: 100,
      forma: 'dinheiro',
      status: 'pendente',
      criadoEm: '2026-11-20 10:00:00',
    })
    inserirPagamento(conexao.db, {
      reservaId: 2,
      valor: 200,
      forma: 'pix',
      status: 'pago',
      criadoEm: '2026-11-22 10:00:00',
      pagoEm: '2026-11-22 11:00:00',
    })
    inserirPagamento(conexao.db, {
      reservaId: 3,
      valor: 300,
      forma: 'cartao_debito',
      status: 'estornado',
      criadoEm: '2026-11-21 10:00:00',
    })

    expect(repositorio.listar().map((pagamento) => pagamento.reservaId)).toEqual([2, 3, 1])
    expect(repositorio.listar({ reservaId: 3 }).map((item) => item.forma)).toEqual([
      'cartao_debito',
    ])
    expect(repositorio.listar({ status: 'pago' }).map((item) => item.status)).toEqual(['pago'])
    expect(repositorio.listar({ reservaId: 1, status: 'pago' })).toEqual([])

    conexao.fechar()
  })

  it('confirma somente pagamento pendente e registra pago_em', () => {
    const conexao = bancoComReservas()
    const repositorio = new PagamentoRepositorio(conexao.db)
    const criado = repositorio.criar({ reservaId: 1, valor: 80, forma: 'cartao_credito' })

    const confirmado = repositorio.confirmar(criado.id)

    expect(confirmado?.status).toBe('pago')
    expect(typeof confirmado?.pagoEm).toBe('string')
    expect(repositorio.confirmar(criado.id)).toBeNull()
    expect(repositorio.buscarPorId(criado.id)?.status).toBe('pago')
    expect(repositorio.confirmar(999)).toBeNull()

    conexao.fechar()
  })

  it('estorna somente pagamento pago', () => {
    const conexao = bancoComReservas(2)
    const repositorio = new PagamentoRepositorio(conexao.db)
    const primeiro = repositorio.criar({ reservaId: 1, valor: 80, forma: 'pix' })
    const segundo = repositorio.criar({ reservaId: 2, valor: 90, forma: 'dinheiro' })
    repositorio.confirmar(primeiro.id)

    const estornado = repositorio.estornar(primeiro.id)

    expect(estornado?.status).toBe('estornado')
    expect(repositorio.estornar(primeiro.id)).toBeNull()
    expect(repositorio.estornar(segundo.id)).toBeNull()
    expect(repositorio.buscarPorId(segundo.id)?.status).toBe('pendente')
    expect(repositorio.estornar(999)).toBeNull()

    conexao.fechar()
  })

  it('devolve null quando não há pagamento para o id ou a reserva', () => {
    const conexao = bancoComReservas()
    const repositorio = new PagamentoRepositorio(conexao.db)

    expect(repositorio.buscarPorId(404)).toBeNull()
    expect(repositorio.buscarPorReserva(404)).toBeNull()

    conexao.fechar()
  })
})
