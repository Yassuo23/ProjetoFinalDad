import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/** Tabela do P1. CHECK de estado espelha ESTADOS_EQUIPAMENTO (DDL estático). */
export const migracaoEquipamentos: Migracao = {
  id: 2,
  nome: '002-equipamentos',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE equipamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        categoria_id INTEGER NOT NULL REFERENCES categorias(id),
        preco_diaria REAL NOT NULL CHECK (preco_diaria >= 0),
        valor_aquisicao REAL NOT NULL CHECK (valor_aquisicao >= 0),
        estado TEXT NOT NULL DEFAULT 'disponivel'
          CHECK (estado IN ('disponivel', 'em_manutencao', 'baixado', 'reservado')),
        descricao TEXT,
        ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
      )
    `)

    db.exec('CREATE INDEX idx_equipamentos_categoria ON equipamentos(categoria_id)')
  },
}
