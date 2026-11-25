import type { RegistroBanco } from '../ClienteBanco'
import type { ClienteMigracao, Migracao } from '../Migrador'

const TABELAS_AUDITADAS = [
  'fornecedor',
  'cliente',
  'equipamento',
  'reserva',
  'pagamento',
  'devolucao',
] as const

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

/** Lê `tabela`/`coluna` sem depender da casing devolvida pelo driver. */
function texto(registro: RegistroBanco, chaves: readonly string[]): string | undefined {
  for (const chave of chaves) {
    const valor = registro[chave]
    if (typeof valor === 'string') return valor.toLowerCase()
    if (typeof valor === 'number') return String(valor).toLowerCase()
  }
  return undefined
}

function chaveColuna(tabela: string, coluna: string): string {
  return `${tabela}.${coluna}`
}

export const migracaoAuditoriaSoftDelete: Migracao = {
  id: 3,
  nome: '003-auditoria-soft-delete',
  async aplicar(db: ClienteMigracao): Promise<void> {
    const marcadoresTabelas = TABELAS_AUDITADAS.map(() => '?').join(', ')
    const marcadoresColunas = COLUNAS_AUDITORIA.map(() => '?').join(', ')

    const linhas = await db.query(
      `SELECT TABLE_NAME AS tabela, COLUMN_NAME AS coluna
         FROM information_schema.columns
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (${marcadoresTabelas})
          AND COLUMN_NAME IN (${marcadoresColunas})`,
      [...TABELAS_AUDITADAS, ...COLUNAS_AUDITORIA.map(({ nome }) => nome)],
    )

    const existentes = new Set<string>()
    for (const linha of linhas) {
      const tabela = texto(linha, ['tabela', 'table_name', 'TABLE_NAME'])
      const coluna = texto(linha, ['coluna', 'column_name', 'COLUMN_NAME'])
      if (tabela && coluna) existentes.add(chaveColuna(tabela, coluna))
    }

    for (const tabela of TABELAS_AUDITADAS) {
      const faltantes = COLUNAS_AUDITORIA.filter(
        ({ nome }) => !existentes.has(chaveColuna(tabela, nome)),
      )
      if (faltantes.length === 0) continue

      await db.execute(
        `ALTER TABLE \`${tabela}\`\n  ${faltantes.map(({ alter }) => alter).join(',\n  ')}`,
      )
    }
  },
}
