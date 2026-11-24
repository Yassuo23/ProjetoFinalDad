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
    status?: StatusReserva
  },
): void {
  db.prepare(`
    INSERT INTO reservas (cliente_id, equipamento_id, inicio, fim, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(1, dados.equipamentoId ?? 1, dados.inicio, dados.fim, dados.status ?? 'pendente')
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
})
