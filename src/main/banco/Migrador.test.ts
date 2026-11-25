import { describe, expect, it } from 'vitest'
import type { ClienteMigracao } from './Migrador'
import { Migrador } from './Migrador'
import { MIGRACOES } from './migracoes'

type ParametroSql = string | number | null

class ClienteMemoria implements ClienteMigracao {
  private migracoes: Array<{ id: number; nome: string }> = []
  private categorias: ParametroSql[][] = []
  private estadoAnterior:
    | { migracoes: Array<{ id: number; nome: string }>; categorias: ParametroSql[][] }
    | undefined

  async query(_sql: string): Promise<Array<{ id: number }>> {
    return this.migracoes.map(({ id }) => ({ id }))
  }

  async execute(sql: string, valores: ParametroSql[] = []): Promise<void> {
    if (sql.includes('INSERT INTO migracoes')) {
      this.migracoes.push({ id: Number(valores[0]), nome: String(valores[1]) })
    }
    if (sql.includes('INSERT IGNORE INTO categorias')) this.categorias.push(valores)
  }

  async beginTransaction(): Promise<void> {
    this.estadoAnterior = {
      migracoes: [...this.migracoes],
      categorias: [...this.categorias],
    }
  }

  async commit(): Promise<void> {
    this.estadoAnterior = undefined
  }

  async rollback(): Promise<void> {
    if (!this.estadoAnterior) throw new Error('Transação não iniciada')
    this.migracoes = this.estadoAnterior.migracoes
    this.categorias = this.estadoAnterior.categorias
    this.estadoAnterior = undefined
  }

  get totalCategorias(): number {
    return this.categorias.length
  }

  get totalMigracoes(): number {
    return this.migracoes.length
  }
}

describe('Migrador', () => {
  it('aplica as migrações uma única vez e semeia as categorias', async () => {
    const cliente = new ClienteMemoria()
    const migrador = new Migrador(cliente, MIGRACOES)

    expect(await migrador.aplicarPendentes()).toBe(1)
    expect(await migrador.aplicarPendentes()).toBe(0)
    expect(cliente.totalCategorias).toBe(4)
  })

  it('faz rollback da migração que falha', async () => {
    const cliente = new ClienteMemoria()
    const quebrada = {
      id: 9,
      nome: '009-quebrada',
      aplicar: async (db: ClienteMigracao): Promise<void> => {
        await db.execute('INSERT IGNORE INTO categorias VALUES (?, ?)', ['Teste', null])
        throw new Error('falhou de propósito')
      },
    }
    const migrador = new Migrador(cliente, [quebrada])

    await expect(migrador.aplicarPendentes()).rejects.toThrow('falhou de propósito')
    expect(cliente.totalCategorias).toBe(0)
    expect(cliente.totalMigracoes).toBe(0)
  })
})
