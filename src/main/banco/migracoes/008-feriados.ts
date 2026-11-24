import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/**
 * Tabela do P9. `uf = ''` representa feriado nacional: como SQLite trata NULL como distinto
 * em UNIQUE, o sentinela evita duplicatas de âmbito nacional.
 */
export const migracaoFeriados: Migracao = {
  id: 8,
  nome: '008-feriados',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE feriados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'personalizado')),
        uf TEXT NOT NULL DEFAULT '',
        UNIQUE (data, uf)
      )
    `)

    db.exec('CREATE INDEX idx_feriados_data ON feriados(data)')
  },
}
