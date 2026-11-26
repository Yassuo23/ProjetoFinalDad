import type { RegistroBanco } from '../ClienteBanco'
import type { ClienteMigracao, Migracao } from '../Migrador'

const TABELA = 'cliente'
const COLUNA = 'id_usuario'
const RESTRICAO = 'fk_cliente_usuario'

/** Lê `coluna`/`restricao` sem depender da casing devolvida pelo driver. */
function texto(registro: RegistroBanco, chaves: readonly string[]): string | undefined {
  for (const chave of chaves) {
    const valor = registro[chave]
    if (typeof valor === 'string') return valor.toLowerCase()
    if (typeof valor === 'number') return String(valor).toLowerCase()
  }
  return undefined
}

/**
 * Migração 007 (ADR 0009): aditiva e idempotente. Liga a identidade `usuario`
 * ao cadastro `cliente`, sem criar tabela paralela de credenciais e sem tocar
 * nas migrações 001–006.
 *
 * - Coluna UNIQUE: uma conta de cliente pertence a no máximo um usuário.
 * - FK com `ON DELETE SET NULL`: apagar um usuário não apaga o histórico de
 *   locações do cliente.
 * - A checagem em `information_schema` cobre bancos onde a coluna ou a FK já
 *   foram criadas manualmente (MySQL 8 não aceita `ADD COLUMN IF NOT EXISTS`).
 */
export const migracaoVinculoUsuarioCliente: Migracao = {
  id: 7,
  nome: '007-vinculo-usuario-cliente',
  async aplicar(db: ClienteMigracao): Promise<void> {
    const colunas = await db.query(
      `SELECT COLUMN_NAME AS coluna
         FROM information_schema.columns
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?`,
      [TABELA, COLUNA],
    )
    const existeColuna = colunas.some(
      (linha) => texto(linha, ['coluna', 'COLUMN_NAME']) === COLUNA.toLowerCase(),
    )

    if (!existeColuna) {
      await db.execute(
        `ALTER TABLE \`${TABELA}\`
           ADD COLUMN \`${COLUNA}\` INT NULL UNIQUE,
           ADD CONSTRAINT \`${RESTRICAO}\`
             FOREIGN KEY (\`${COLUNA}\`) REFERENCES \`usuario\` (\`id_usuario\`)
             ON DELETE SET NULL ON UPDATE CASCADE`,
      )
      return
    }

    const restricoes = await db.query(
      `SELECT CONSTRAINT_NAME AS restricao
         FROM information_schema.table_constraints
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?`,
      [TABELA, RESTRICAO],
    )
    const existeFk = restricoes.some(
      (linha) => texto(linha, ['restricao', 'CONSTRAINT_NAME']) === RESTRICAO.toLowerCase(),
    )
    if (!existeFk) {
      await db.execute(
        `ALTER TABLE \`${TABELA}\`
           ADD CONSTRAINT \`${RESTRICAO}\`
             FOREIGN KEY (\`${COLUNA}\`) REFERENCES \`usuario\` (\`id_usuario\`)
             ON DELETE SET NULL ON UPDATE CASCADE`,
      )
    }
  },
}
