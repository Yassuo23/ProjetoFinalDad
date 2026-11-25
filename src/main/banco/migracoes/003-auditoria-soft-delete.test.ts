import { describe, expect, it } from 'vitest'
import type { ClienteBanco, ParametroSql, RegistroBanco, ResultadoEscrita } from '../ClienteBanco'
import { migracaoAuditoriaSoftDelete } from './003-auditoria-soft-delete'

const SUCESSO: ResultadoEscrita = { insertId: 0, afetadas: 0 }
const TABELAS = [
  'fornecedor',
  'cliente',
  'equipamento',
  'reserva',
  'pagamento',
  'devolucao',
] as const
const COLUNAS = ['ativo', 'atualizado_em'] as const

const ATIVO = 'ADD COLUMN `ativo` TINYINT(1) NOT NULL DEFAULT 1'
const ATUALIZADO_EM =
  'ADD COLUMN `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'

class ClienteBancoFalso implements ClienteBanco {
  readonly alteracoes: string[] = []
  private readonly colunas: Map<string, Set<string>>

  constructor(colunasPorTabela: Readonly<Record<string, readonly string[]>> = {}) {
    this.colunas = new Map(
      Object.entries(colunasPorTabela).map(([tabela, colunas]) => [tabela, new Set(colunas)]),
    )
  }

  async query(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<readonly RegistroBanco[]> {
    if (!sql.includes('information_schema.columns')) {
      throw new Error(`Query inesperada: ${sql}`)
    }

    const linhas: RegistroBanco[] = []
    for (const valor of valores) {
      if (typeof valor !== 'string') continue
      const existentes = this.colunas.get(valor)
      if (!existentes) continue
      for (const coluna of existentes) linhas.push({ tabela: valor, coluna })
    }
    return linhas
  }

  async execute(sql: string, _valores: readonly ParametroSql[] = []): Promise<ResultadoEscrita> {
    if (!sql.includes('ALTER TABLE')) throw new Error(`Execução inesperada: ${sql}`)

    this.alteracoes.push(sql)
    const tabela = /ALTER TABLE `([^`]+)`/.exec(sql)?.[1]
    if (!tabela || !TABELAS.some((nome) => nome === tabela)) {
      throw new Error(`Tabela inesperada no ALTER: ${sql}`)
    }

    const colunas = this.colunas.get(tabela) ?? new Set<string>()
    if (sql.includes('`ativo`')) colunas.add('ativo')
    if (sql.includes('`atualizado_em`')) colunas.add('atualizado_em')
    this.colunas.set(tabela, colunas)

    return SUCESSO
  }

  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
}

function schemaCompleto(): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(TABELAS.map((tabela) => [tabela, COLUNAS]))
}

describe('migração 003-auditoria-soft-delete', () => {
  it('não altera tabelas que já possuem ativo e atualizado_em', async () => {
    const cliente = new ClienteBancoFalso(schemaCompleto())

    await migracaoAuditoriaSoftDelete.aplicar(cliente)

    expect(cliente.alteracoes).toEqual([])
  })

  it('adiciona as colunas em todas as tabelas quando ausentes', async () => {
    const cliente = new ClienteBancoFalso()

    await migracaoAuditoriaSoftDelete.aplicar(cliente)

    expect(cliente.alteracoes).toHaveLength(TABELAS.length)
    for (const tabela of TABELAS) {
      const alter = cliente.alteracoes.find((sql) => sql.includes(`ALTER TABLE \`${tabela}\``))
      expect(alter ?? '').toContain(ATIVO)
      expect(alter ?? '').toContain(ATUALIZADO_EM)
    }
  })

  it('só adiciona a coluna faltante quando a outra já existe', async () => {
    const schema = Object.fromEntries(
      TABELAS.map((tabela) => [tabela, tabela === 'cliente' ? ['ativo'] : COLUNAS]),
    )
    const cliente = new ClienteBancoFalso(schema)

    await migracaoAuditoriaSoftDelete.aplicar(cliente)

    expect(cliente.alteracoes).toHaveLength(1)
    expect(cliente.alteracoes[0] ?? '').toContain('ALTER TABLE `cliente`')
    expect(cliente.alteracoes[0] ?? '').toContain(ATUALIZADO_EM)
    expect(cliente.alteracoes[0] ?? '').not.toContain(ATIVO)
  })

  it('não repete ALTER na segunda execução', async () => {
    const cliente = new ClienteBancoFalso()

    await migracaoAuditoriaSoftDelete.aplicar(cliente)
    const total = cliente.alteracoes.length
    await migracaoAuditoriaSoftDelete.aplicar(cliente)

    expect(total).toBe(TABELAS.length)
    expect(cliente.alteracoes).toHaveLength(total)
  })
})
