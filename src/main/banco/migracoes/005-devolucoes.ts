import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/** Tabela do P6. Uma devolução por reserva, com o cálculo persistido para auditoria. */
export const migracaoDevolucoes: Migracao = {
  id: 5,
  nome: '005-devolucoes',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE devolucoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reserva_id INTEGER NOT NULL UNIQUE REFERENCES reservas(id),
        devolvido_em TEXT NOT NULL,
        observacoes TEXT,
        dias_atraso INTEGER NOT NULL DEFAULT 0 CHECK (dias_atraso >= 0),
        valor_diaria REAL NOT NULL CHECK (valor_diaria >= 0),
        valor_multa REAL NOT NULL CHECK (valor_multa >= 0),
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    db.exec('CREATE INDEX idx_devolucoes_reserva ON devolucoes(reserva_id)')
  },
}
