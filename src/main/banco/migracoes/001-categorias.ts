import type { DatabaseSync } from 'node:sqlite'
import type { Migracao } from '../Migrador'

const CATEGORIAS_INICIAIS: ReadonlyArray<readonly [string, string]> = [
  ['Camping', 'Barracas, sacos de dormir e acessórios'],
  ['Escalada', 'Cordas, cadeirinhas e equipamentos de proteção'],
  ['Ciclismo', 'Bicicletas, capacetes e peças'],
  ['Trilha', 'Mochilas, bastões e calçados'],
]

export const migracaoCategorias: Migracao = {
  id: 1,
  nome: '001-categorias',
  aplicar(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT
      )
    `)

    const inserir = db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)')
    for (const [nome, descricao] of CATEGORIAS_INICIAIS) {
      inserir.run(nome, descricao)
    }
  },
}
