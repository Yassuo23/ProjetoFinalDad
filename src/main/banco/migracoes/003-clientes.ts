import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/** Tabela do P2. Email único (NULL é permitido pelo SQLite) e inativação lógica. */
export const migracaoClientes: Migracao = {
  id: 3,
  nome: '003-clientes',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE,
        telefone TEXT,
        cep TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        uf TEXT,
        ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
      )
    `)

    db.exec('CREATE INDEX idx_clientes_nome ON clientes(nome COLLATE NOCASE)')
  },
}
