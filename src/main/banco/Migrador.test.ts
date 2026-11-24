import { describe, expect, it } from 'vitest'
import { ConexaoBanco } from './ConexaoBanco'
import { Migrador } from './Migrador'
import { MIGRACOES } from './migracoes'

describe('Migrador', () => {
  it('aplica as migrações uma única vez e semeia as categorias', () => {
    const conexao = new ConexaoBanco(':memory:')
    const migrador = new Migrador(conexao.db, MIGRACOES)

    expect(migrador.aplicarPendentes()).toBe(4)
    expect(migrador.aplicarPendentes()).toBe(0)

    const total = conexao.db.prepare('SELECT COUNT(*) AS total FROM categorias').get()
    expect(total?.total).toBe(4)

    const tabelaEquipamentos = conexao.db
      .prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name = 'equipamentos'")
      .get()
    expect(tabelaEquipamentos?.total).toBe(1)

    conexao.fechar()
  })

  it('faz rollback da migração que falha', () => {
    const conexao = new ConexaoBanco(':memory:')
    const quebrada = {
      id: 9,
      nome: '009-quebrada',
      aplicar: (): void => {
        throw new Error('falhou de propósito')
      },
    }
    const migrador = new Migrador(conexao.db, [quebrada])

    expect(() => migrador.aplicarPendentes()).toThrow('falhou de propósito')

    const aplicadas = conexao.db.prepare('SELECT COUNT(*) AS total FROM migracoes').get()
    expect(aplicadas?.total).toBe(0)

    conexao.fechar()
  })
})
