import type { RegistroBanco } from '../ClienteBanco'
import type { ClienteMigracao, Migracao } from '../Migrador'

const TABELA_CATEGORIAS = 'categorias'
const COLUNAS_AUDITORIA = [
  {
    nome: 'ativo',
    alter: 'ADD COLUMN `ativo` TINYINT(1) NOT NULL DEFAULT 1',
  },
  {
    nome: 'atualizado_em',
    alter:
      'ADD COLUMN `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
] as const

/** Lê `coluna` sem depender da casing devolvida pelo driver. */
function texto(registro: RegistroBanco, chaves: readonly string[]): string | undefined {
  for (const chave of chaves) {
    const valor = registro[chave]
    if (typeof valor === 'string') return valor.toLowerCase()
    if (typeof valor === 'number') return String(valor).toLowerCase()
  }
  return undefined
}

/**
 * Migração aditiva (id 006): cria a tabela de usuários e estende `categorias`
 * com a mesma auditoria/soft delete da migração 003.
 *
 * - `CREATE TABLE IF NOT EXISTS` + checagem via `information_schema` = idempotente.
 * - Nenhuma credencial é semeada: o primeiro administrador nasce de
 *   `auth:bootstrap`, com senha escolhida na chamada (ADR 0007).
 * - `senha_hash` guarda apenas `scrypt$<salt>$<hash>`; nunca texto puro.
 */
export const migracaoAutenticacaoCategorias: Migracao = {
  id: 6,
  nome: '006-autenticacao-e-auditoria-categorias',
  async aplicar(db: ClienteMigracao): Promise<void> {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        login VARCHAR(80) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        perfil VARCHAR(20) NOT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_usuario_login (login),
        INDEX idx_usuario_perfil (perfil)
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    const marcadores = COLUNAS_AUDITORIA.map(() => '?').join(', ')
    const linhas = await db.query(
      `SELECT COLUMN_NAME AS coluna
         FROM information_schema.columns
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME IN (${marcadores})`,
      [TABELA_CATEGORIAS, ...COLUNAS_AUDITORIA.map(({ nome }) => nome)],
    )

    const existentes = new Set<string>()
    for (const linha of linhas) {
      const coluna = texto(linha, ['coluna', 'COLUMN_NAME'])
      if (coluna) existentes.add(coluna)
    }

    const faltantes = COLUNAS_AUDITORIA.filter(({ nome }) => !existentes.has(nome))
    if (faltantes.length > 0) {
      // Identificadores vêm de constantes fixas, nunca de payload: SQL parametrizado
      // não se aplica a nomes de coluna, então a lista é whitelistada acima.
      await db.execute(
        `ALTER TABLE \`${TABELA_CATEGORIAS}\`\n  ${faltantes.map(({ alter }) => alter).join(',\n  ')}`,
      )
    }
  },
}
