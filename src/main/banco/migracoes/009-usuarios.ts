import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

/** Tabela do P10. Guarda apenas hash da senha — nunca texto plano. */
export const migracaoUsuarios: Migracao = {
  id: 9,
  nome: '009-usuarios',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        login TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        perfil TEXT NOT NULL CHECK (perfil IN ('administrador', 'operador', 'visualizador')),
        ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    db.exec('CREATE INDEX idx_usuarios_perfil ON usuarios(perfil)')
  },
}
