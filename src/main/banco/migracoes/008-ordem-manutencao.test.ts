import { describe, expect, it } from 'vitest'
import type { ParametroSql, RegistroBanco, ResultadoEscrita } from '../ClienteBanco'
import type { ClienteMigracao } from '../Migrador'
import { MIGRACOES } from '.'
import { migracaoOrdemManutencao } from './008-ordem-manutencao'

const SUCESSO: ResultadoEscrita = { insertId: 0, afetadas: 0 }

interface Chamada {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

class ClienteMigracaoFalso implements ClienteMigracao {
  readonly chamadas: Chamada[] = []

  constructor(
    private readonly tabelas: readonly RegistroBanco[] = [],
    private readonly restricoes: readonly RegistroBanco[] = [],
  ) {}

  async query(sql: string, valores: readonly ParametroSql[] = []): Promise<RegistroBanco[]> {
    this.chamadas.push({ sql, valores })
    if (sql.includes('information_schema.tables')) return [...this.tabelas]
    if (sql.includes('information_schema.table_constraints')) return [...this.restricoes]
    return []
  }

  async execute(sql: string, valores: readonly ParametroSql[] = []): Promise<ResultadoEscrita> {
    this.chamadas.push({ sql, valores })
    return SUCESSO
  }

  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}

  gets(): readonly string[] {
    return this.chamadas.map(({ sql }) => sql)
  }

  alters(): readonly string[] {
    return this.gets().filter((sql) => sql.includes('ALTER TABLE'))
  }

  creates(): readonly string[] {
    return this.gets().filter((sql) => sql.includes('CREATE TABLE'))
  }
}

describe('migração 008 — ordem de manutenção', () => {
  it('é aditiva depois da 007', () => {
    expect(MIGRACOES.map((migracao) => migracao.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(migracaoOrdemManutencao.id).toBe(8)
  })

  it('cria a tabela com FKs para equipamento e fornecedor', async () => {
    const cliente = new ClienteMigracaoFalso()

    await migracaoOrdemManutencao.aplicar(cliente)

    expect(cliente.creates()).toHaveLength(1)
    const sql = cliente.creates()[0] ?? ''
    expect(sql).toContain('id_equipamento INT NOT NULL')
    expect(sql).toContain('id_fornecedor INT NULL')
    expect(sql).toContain('ON DELETE RESTRICT ON UPDATE CASCADE')
    expect(sql).toContain('ON DELETE SET NULL ON UPDATE CASCADE')
    expect(cliente.alters()).toHaveLength(0)
  })

  it('não altera nada quando tabela e FKs já existem', async () => {
    const cliente = new ClienteMigracaoFalso(
      [{ TABLE_NAME: 'ORDEM_MANUTENCAO' }],
      [
        { restricao: 'FK_ORDEM_MANUTENCAO_EQUIPAMENTO' },
        { CONSTRAINT_NAME: 'fk_ordem_manutencao_fornecedor' },
      ],
    )

    await migracaoOrdemManutencao.aplicar(cliente)
    await migracaoOrdemManutencao.aplicar(cliente)

    expect(cliente.creates()).toHaveLength(0)
    expect(cliente.alters()).toHaveLength(0)
  })

  it('acrescenta somente as FKs faltantes quando a tabela já existe', async () => {
    const cliente = new ClienteMigracaoFalso([{ tabela: 'ordem_manutencao' }])

    await migracaoOrdemManutencao.aplicar(cliente)

    expect(cliente.creates()).toHaveLength(0)
    expect(cliente.alters()).toHaveLength(2)
    expect(cliente.alters()[0]).toContain('ADD CONSTRAINT `fk_ordem_manutencao_equipamento`')
    expect(cliente.alters()[1]).toContain('ADD CONSTRAINT `fk_ordem_manutencao_fornecedor`')
  })
})
