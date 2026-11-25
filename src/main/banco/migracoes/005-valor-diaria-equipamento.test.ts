import { describe, expect, it } from 'vitest'
import type { ClienteBanco, ParametroSql, RegistroBanco, ResultadoEscrita } from '../ClienteBanco'
import { MIGRACOES } from './index'
import { migracaoValorDiariaEquipamento } from './005-valor-diaria-equipamento'

const SUCESSO: ResultadoEscrita = { insertId: 0, afetadas: 0 }
const ALTER = 'ADD COLUMN `valor_diaria` DECIMAL(10,2) NOT NULL DEFAULT 0.00'

interface Execucao {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

class ClienteBancoFalso implements ClienteBanco {
  readonly executadas: Execucao[] = []
  private existeColuna: boolean

  constructor(
    colunaExiste: boolean,
    private readonly chaveColuna = 'coluna',
  ) {
    this.existeColuna = colunaExiste
  }

  async query(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<readonly RegistroBanco[]> {
    expect(sql).toContain('information_schema.columns')
    expect(valores).toEqual(['equipamento', 'valor_diaria'])
    if (!this.existeColuna) return []
    return [{ [this.chaveColuna]: 'VALOR_DIARIA' }]
  }

  async execute(sql: string, valores: readonly ParametroSql[] = []): Promise<ResultadoEscrita> {
    this.executadas.push({ sql, valores })
    if (sql.includes('ALTER TABLE')) this.existeColuna = true
    return SUCESSO
  }

  alteracoes(): readonly Execucao[] {
    return this.executadas.filter(({ sql }) => sql.includes('ALTER TABLE'))
  }

  backfills(): readonly Execucao[] {
    return this.executadas.filter(({ sql }) => sql.includes('UPDATE'))
  }

  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
}

describe('migração 005-valor-diaria-equipamento', () => {
  it('adiciona a coluna em um banco limpo sem IF NOT EXISTS', async () => {
    const cliente = new ClienteBancoFalso(false)

    await migracaoValorDiariaEquipamento.aplicar(cliente)

    expect(cliente.alteracoes()).toHaveLength(1)
    const alter = cliente.alteracoes()[0]?.sql ?? ''
    expect(alter).toContain('ALTER TABLE `equipamento`')
    expect(alter).toContain(ALTER)
    expect(alter.toUpperCase()).not.toContain('IF NOT EXISTS')
  })

  it('faz backfill de NULL com parâmetro', async () => {
    const cliente = new ClienteBancoFalso(false)

    await migracaoValorDiariaEquipamento.aplicar(cliente)

    const backfill = cliente.backfills()[0]
    expect(backfill?.sql).toContain('SET `valor_diaria` = ?')
    expect(backfill?.sql).toContain('`valor_diaria` IS NULL')
    expect(backfill?.valores).toEqual([0])
  })

  it('não altera a tabela quando a coluna foi criada manualmente, mas ainda faz backfill', async () => {
    const cliente = new ClienteBancoFalso(true, 'COLUMN_NAME')

    await migracaoValorDiariaEquipamento.aplicar(cliente)

    expect(cliente.alteracoes()).toEqual([])
    expect(cliente.backfills()).toHaveLength(1)
  })

  it('é idempotente: a segunda execução não repete o ALTER', async () => {
    const cliente = new ClienteBancoFalso(false)

    await migracaoValorDiariaEquipamento.aplicar(cliente)
    await migracaoValorDiariaEquipamento.aplicar(cliente)

    expect(cliente.alteracoes()).toHaveLength(1)
    expect(cliente.backfills()).toHaveLength(2)
  })

  it('fica registrada depois da migração 004', () => {
    expect(migracaoValorDiariaEquipamento.id).toBe(5)
    expect(migracaoValorDiariaEquipamento.nome).toBe('005-valor-diaria-equipamento')
    expect(MIGRACOES.findIndex((migracao) => migracao.id === 5)).toBeGreaterThan(
      MIGRACOES.findIndex((migracao) => migracao.id === 4),
    )
  })
})
