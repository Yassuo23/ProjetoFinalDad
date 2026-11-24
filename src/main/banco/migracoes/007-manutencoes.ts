import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/** Tabela do P8. A abertura muda o estado do equipamento; a conclusão o devolve para 'disponivel'. */
export const migracaoManutencoes: Migracao = {
  id: 7,
  nome: '007-manutencoes',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE manutencoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id),
        descricao TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'aberta'
          CHECK (status IN ('aberta', 'concluida')),
        aberta_em TEXT NOT NULL DEFAULT (datetime('now')),
        concluida_em TEXT,
        custo REAL CHECK (custo IS NULL OR custo >= 0)
      )
    `)

    db.exec(
      "CREATE UNIQUE INDEX idx_manutencoes_aberta ON manutencoes(equipamento_id) WHERE status = 'aberta'",
    )
    db.exec('CREATE INDEX idx_manutencoes_status ON manutencoes(status)')
  },
}
