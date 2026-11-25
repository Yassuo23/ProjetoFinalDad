import type { ClienteMigracao, Migracao } from '../Migrador'

const CATEGORIAS_INICIAIS: ReadonlyArray<readonly [string, string]> = [
  ['Bicicleta', 'Bicicletas, capacetes e acessórios de ciclismo'],
  ['Caiaque', 'Caiaques, remos e acessórios náuticos'],
  ['Prancha', 'Pranchas, stand up paddle e acessórios'],
  ['Camping', 'Barracas, sacos de dormir e itens de acampamento'],
]

export const migracaoCategorias: Migracao = {
  id: 1,
  nome: '001-categorias',
  async aplicar(db: ClienteMigracao): Promise<void> {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        descricao TEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    const inserir = 'INSERT IGNORE INTO categorias (nome, descricao) VALUES (?, ?)'
    for (const [nome, descricao] of CATEGORIAS_INICIAIS) {
      await db.execute(inserir, [nome, descricao])
    }
  },
}
