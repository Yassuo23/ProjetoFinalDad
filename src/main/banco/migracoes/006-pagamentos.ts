import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/** Tabela do P7. Um pagamento por reserva, com status próprio e data de quitação. */
export const migracaoPagamentos: Migracao = {
  id: 6,
  nome: '006-pagamentos',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reserva_id INTEGER NOT NULL UNIQUE REFERENCES reservas(id),
        valor REAL NOT NULL CHECK (valor > 0),
        forma TEXT NOT NULL CHECK (forma IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito')),
        status TEXT NOT NULL DEFAULT 'pendente'
          CHECK (status IN ('pendente', 'pago', 'estornado')),
        pago_em TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    db.exec('CREATE INDEX idx_pagamentos_status ON pagamentos(status)')
  },
}
