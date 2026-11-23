import type { DatabaseSync } from 'node:sqlite'

export interface Migracao {
  readonly id: number
  readonly nome: string
  aplicar(db: DatabaseSync): void
}

export class Migrador {
  private readonly ordenadas: readonly Migracao[]

  constructor(
    private readonly db: DatabaseSync,
    migracoes: readonly Migracao[],
  ) {
    const ids = new Set(migracoes.map((migracao) => migracao.id))
    if (ids.size !== migracoes.length) {
      throw new Error('Migrações com id duplicado')
    }
    this.ordenadas = [...migracoes].sort((a, b) => a.id - b.id)
  }

  /** Aplica apenas o que ainda não está na tabela `migracoes`; retorna quantas rodaram. */
  aplicarPendentes(): number {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migracoes (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        aplicada_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    const linhas = this.db.prepare('SELECT id FROM migracoes').all()
    const aplicadas = new Set(linhas.map((linha) => Number(linha.id)))

    let total = 0
    for (const migracao of this.ordenadas) {
      if (aplicadas.has(migracao.id)) continue

      this.db.exec('BEGIN')
      try {
        migracao.aplicar(this.db)
        this.db
          .prepare('INSERT INTO migracoes (id, nome) VALUES (?, ?)')
          .run(migracao.id, migracao.nome)
        this.db.exec('COMMIT')
        total += 1
      } catch (erro) {
        this.db.exec('ROLLBACK')
        throw erro
      }
    }

    return total
  }
}
