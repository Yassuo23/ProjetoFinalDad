import type { RegistroBanco } from '../ClienteBanco'
import type { ClienteMigracao, Migracao } from '../Migrador'

const TABELA = 'ordem_manutencao'
const FK_EQUIPAMENTO = 'fk_ordem_manutencao_equipamento'
const FK_FORNECEDOR = 'fk_ordem_manutencao_fornecedor'

const FOREIGN_KEYS = [
  {
    nome: FK_EQUIPAMENTO,
    coluna: 'id_equipamento',
    referencia: 'equipamento (id_equipamento)',
    acao: 'ON DELETE RESTRICT ON UPDATE CASCADE',
  },
  {
    nome: FK_FORNECEDOR,
    coluna: 'id_fornecedor',
    referencia: 'fornecedor (id_fornecedor)',
    acao: 'ON DELETE SET NULL ON UPDATE CASCADE',
  },
] as const

/** Lê `tabela`/`restricao` sem depender da casing devolvida pelo driver. */
function texto(registro: RegistroBanco, chaves: readonly string[]): string | undefined {
  for (const chave of chaves) {
    const valor = registro[chave]
    if (typeof valor === 'string') return valor.toLowerCase()
    if (typeof valor === 'number') return String(valor).toLowerCase()
  }
  return undefined
}

/**
 * Migração 008 (ADR 0007): cria a entidade de manutenção com vínculos
 * explícitos a equipamento e fornecedor.
 *
 * - `CREATE TABLE IF NOT EXISTS` cobre a criação; cada FK é verificado em
 *   `information_schema` porque o MySQL 8 não aceita `ADD CONSTRAINT IF NOT EXISTS`.
 * - `ON DELETE RESTRICT` no equipamento preserva o histórico de ordens; no
 *   fornecedor, `SET NULL` mantém a ordem quando o cadastro é inativado/removido.
 * - Nenhuma ordem é semeada aqui: dados de demonstração ficam em `npm run seed`.
 */
export const migracaoOrdemManutencao: Migracao = {
  id: 8,
  nome: '008-ordem-manutencao',
  async aplicar(db: ClienteMigracao): Promise<void> {
    const tabelas = await db.query(
      `SELECT TABLE_NAME AS tabela
         FROM information_schema.tables
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?`,
      [TABELA],
    )
    const existeTabela = tabelas.some(
      (linha) => texto(linha, ['tabela', 'TABLE_NAME']) === TABELA.toLowerCase(),
    )

    if (!existeTabela) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS \`${TABELA}\` (
          id_ordem INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          id_equipamento INT NOT NULL,
          id_fornecedor INT NULL,
          descricao TEXT NOT NULL,
          data_envio DATE NOT NULL,
          data_retorno_prevista DATE NULL,
          data_retorno DATE NULL,
          custo DECIMAL(10,2) NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Aberta',
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_om_equipamento (id_equipamento),
          INDEX idx_om_fornecedor (id_fornecedor),
          INDEX idx_om_status (status),
          INDEX idx_om_envio (data_envio),
          CONSTRAINT \`${FK_EQUIPAMENTO}\`
            FOREIGN KEY (id_equipamento) REFERENCES equipamento (id_equipamento)
            ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT \`${FK_FORNECEDOR}\`
            FOREIGN KEY (id_fornecedor) REFERENCES fornecedor (id_fornecedor)
            ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
      `)
      return
    }

    const restricoes = await db.query(
      `SELECT CONSTRAINT_NAME AS restricao
         FROM information_schema.table_constraints
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME IN (?, ?)`,
      [TABELA, FK_EQUIPAMENTO, FK_FORNECEDOR],
    )
    const existentes = new Set<string>()
    for (const linha of restricoes) {
      const nome = texto(linha, ['restricao', 'CONSTRAINT_NAME'])
      if (nome) existentes.add(nome)
    }

    for (const chave of FOREIGN_KEYS) {
      if (existentes.has(chave.nome.toLowerCase())) continue
      await db.execute(
        `ALTER TABLE \`${TABELA}\`
           ADD CONSTRAINT \`${chave.nome}\`
             FOREIGN KEY (\`${chave.coluna}\`) REFERENCES ${chave.referencia}
             ${chave.acao}`,
      )
    }
  },
}
