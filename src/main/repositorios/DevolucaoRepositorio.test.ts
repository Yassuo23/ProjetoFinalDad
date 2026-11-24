import { describe, expect, it } from 'vitest'
import { ConexaoBanco } from '../banco/ConexaoBanco'
import { Migrador } from '../banco/Migrador'
import { MIGRACOES } from '../banco/migracoes'
import { DevolucaoRepositorio } from './DevolucaoRepositorio'

const INICIO = '2026-12-01T00:00:00.000Z'
const FIM = '2026-12-05T00:00:00.000Z'

function bancoComMigracoes(): ConexaoBanco {
  const conexao = new ConexaoBanco(':memory:')
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()

  conexao.db
    .prepare(`
      INSERT INTO equipamentos (nome, categoria_id, preco_diaria, valor_aquisicao)
      VALUES (?, ?, ?, ?)
    `)
    .run('Tenda', 1, 80, 900)
  conexao.db.prepare('INSERT INTO clientes (nome) VALUES (?)').run('Ana')
  conexao.db
    .prepare(`
      INSERT INTO reservas (cliente_id, equipamento_id, inicio, fim, status)
      VALUES (?, ?, ?, ?, 'confirmada')
    `)
    .run(1, 1, INICIO, FIM)

  return conexao
}

describe('DevolucaoRepositorio', () => {
  it('persiste os valores calculados e busca pela reserva', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new DevolucaoRepositorio(conexao.db)
    const dados = {
      reservaId: 1,
      devolvidoEm: '2026-12-10T12:00:00.000Z',
      observacoes: 'Devolvida com atraso',
      diasAtraso: 5,
      valorDiaria: 80,
      valorMulta: 18,
    }

    const criada = repositorio.criar(dados)

    expect(criada).toEqual({ id: expect.any(Number), ...dados })
    expect(repositorio.buscarPorReserva(1)).toEqual(criada)
    expect(repositorio.existeParaReserva(1)).toBe(true)

    conexao.fechar()
  })

  it('aceita observações nulas', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new DevolucaoRepositorio(conexao.db)

    const criada = repositorio.criar({
      reservaId: 1,
      devolvidoEm: '2026-12-06T12:00:00.000Z',
      observacoes: null,
      diasAtraso: 0,
      valorDiaria: 80,
      valorMulta: 0,
    })

    expect(criada.observacoes).toBeNull()

    conexao.fechar()
  })

  it('devolve null e false para reserva sem devolução', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new DevolucaoRepositorio(conexao.db)

    expect(repositorio.buscarPorReserva(404)).toBeNull()
    expect(repositorio.existeParaReserva(404)).toBe(false)

    conexao.fechar()
  })
})
