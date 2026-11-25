import type { RegistroBanco } from '../ClienteBanco'
import type { ClienteMigracao, Migracao } from '../Migrador'

const TABELA = 'equipamento'
const COLUNA = 'valor_diaria'

/** Lê `coluna` sem depender da casing devolvida pelo driver. */
function texto(registro: RegistroBanco, chaves: readonly string[]): string | undefined {
  for (const chave of chaves) {
    const valor = registro[chave]
    if (typeof valor === 'string') return valor.toLowerCase()
  }
  return undefined
}

/**
 * Aditiva: cria `valor_diaria` quando não existe e normaliza legados nulos
 * (por exemplo, coluna criada manualmente sem DEFAULT) para `0.00`.
 * Nenhuma migração já aplicada é alterada.
 */
export const migracaoValorDiariaEquipamento: Migracao = {
  id: 5,
  nome: '005-valor-diaria-equipamento',
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
           ADD COLUMN \`${COLUNA}\` DECIMAL(10,2) NOT NULL DEFAULT 0.00`,
      )
    }

    await db.execute(`UPDATE \`${TABELA}\` SET \`${COLUNA}\` = ? WHERE \`${COLUNA}\` IS NULL`, [0])
  },
}
