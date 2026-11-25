import type { ClienteBanco } from './ClienteBanco'

/** Alias mantido por compatibilidade com os testes e migrações existentes. */
export type ClienteMigracao = ClienteBanco

export interface Migracao {
  readonly id: number
  readonly nome: string
  aplicar(db: ClienteMigracao): Promise<void>
}

export class Migrador {
  private readonly ordenadas: readonly Migracao[]

  constructor(
    private readonly db: ClienteMigracao,
    migracoes: readonly Migracao[],
  ) {
    const ids = new Set(migracoes.map((migracao) => migracao.id))
    if (ids.size !== migracoes.length) {
      throw new Error('Migrações com id duplicado')
    }
    this.ordenadas = [...migracoes].sort((a, b) => a.id - b.id)
  }

  async aplicarPendentes(): Promise<number> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS migracoes (
        id INT NOT NULL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        aplicada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    const linhas = await this.db.query('SELECT id FROM migracoes')
    const aplicadas = new Set(linhas.map((linha) => Number(linha.id)))

    let total = 0
    for (const migracao of this.ordenadas) {
      if (aplicadas.has(migracao.id)) continue

      await this.db.beginTransaction()
      try {
        await migracao.aplicar(this.db)
        await this.db.execute('INSERT INTO migracoes (id, nome) VALUES (?, ?)', [
          migracao.id,
          migracao.nome,
        ])
        await this.db.commit()
        total += 1
      } catch (erro) {
        try {
          await this.db.rollback()
        } catch (erroRollback) {
          throw new AggregateError([erro, erroRollback], 'Falha ao reverter a migração', {
            cause: erroRollback,
          })
        }
        throw erro
      }
    }

    return total
  }
}
