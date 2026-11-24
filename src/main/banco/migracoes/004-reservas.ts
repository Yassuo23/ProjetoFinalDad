import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/**
 * Tabela criada no P4 porque a disponibilidade depende dela. O P5 acrescenta
 * regras de reserva e clima sobre a mesma estrutura. CHECK de status espelha
 * `StatusReserva` (DDL estático).
 */
export const migracaoReservas: Migracao = {
  id: 4,
  nome: '004-reservas',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id),
        equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id),
        inicio TEXT NOT NULL,
        fim TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendente'
          CHECK (status IN ('pendente', 'confirmada', 'cancelada', 'concluida')),
        local_atividade TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK (inicio < fim)
      )
    `)

    db.exec(
      'CREATE INDEX idx_reservas_equipamento_periodo ON reservas(equipamento_id, inicio, fim)',
    )
    db.exec('CREATE INDEX idx_reservas_status ON reservas(status)')
  },
}
