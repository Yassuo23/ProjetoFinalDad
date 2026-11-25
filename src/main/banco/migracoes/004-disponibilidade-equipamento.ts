import type { RegistroBanco } from '../ClienteBanco'
import type { ClienteMigracao, Migracao } from '../Migrador'

const TABELA = 'equipamento'
const COLUNA = 'disponibilidade'
const PADRAO = 'Disponível'

/** Lê `coluna` sem depender da casing devolvida pelo driver. */
function texto(registro: RegistroBanco, chaves: readonly string[]): string | undefined {
  for (const chave of chaves) {
    const valor = registro[chave]
    if (typeof valor === 'string') return valor.toLowerCase()
  }
  return undefined
}

/**
 * A coluna pode ter sido criada manualmente no banco real (inclusive sem
 * DEFAULT). Por isso a checagem via information_schema governa o ALTER e o
 * backfill roda sempre: NULL e string vazia viram `Disponível` nos dois casos.
 */
export const migracaoDisponibilidadeEquipamento: Migracao = {
  id: 4,
  nome: '004-disponibilidade-equipamento',
  async aplicar(db: ClienteMigracao): Promise<void> {
    const linhas = await db.query(
      `SELECT COLUMN_NAME AS coluna
         FROM information_schema.columns
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?`,
      [TABELA, COLUNA],
    )

    // MySQL 8 não aceita ADD COLUMN IF NOT EXISTS; a checagem é explícita.
    const existe = linhas.some(
      (linha) => texto(linha, ['coluna', 'COLUMN_NAME']) === COLUNA.toLowerCase(),
    )
    if (!existe) {
      await db.execute(
        `ALTER TABLE \`${TABELA}\`
           ADD COLUMN \`${COLUNA}\` VARCHAR(45) NOT NULL DEFAULT '${PADRAO}'`,
      )
    }

    await db.execute(
      `UPDATE \`${TABELA}\`
          SET \`${COLUNA}\` = ?
        WHERE \`${COLUNA}\` IS NULL OR TRIM(\`${COLUNA}\`) = ''`,
      [PADRAO],
    )
  },
}
