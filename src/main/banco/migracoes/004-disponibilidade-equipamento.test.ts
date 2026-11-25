import { describe, expect, it } from 'vitest'
import type { ClienteBanco, ParametroSql, RegistroBanco, ResultadoEscrita } from '../ClienteBanco'
import { migracaoDisponibilidadeEquipamento } from './004-disponibilidade-equipamento'

const SUCESSO: ResultadoEscrita = { insertId: 0, afetadas: 0 }
const ALTER =
  'ADD COLUMN `disponibilidade` VARCHAR(45) NOT NULL DEFAULT \'Disponível\''

interface Execucao {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

class ClienteBancoFalso implements ClienteBanco {
  readonly executadas: Execucao[] = []
  private existeColuna: boolean

  constructor(colunaExiste: boolean, private readonly chaveColuna = 'coluna') {
    this.existeColuna = colunaExiste
  }

  async query(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<readonly RegistroBanco[]> {
    expect(sql).toContain('information_schema.columns')
    expect(valores).toEqual(['equipamento', 'disponibilidade'])
    if (!this.existeColuna) return []
    return [{ [this.chaveColuna]: 'DISPONIBILIDADE' }]
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

describe('migração 004-disponibilidade-equipamento', () => {
  it('adiciona a coluna em um banco limpo sem IF NOT EXISTS', async () => {
    const cliente = new ClienteBancoFalso(false)

    await migracaoDisponibilidadeEquipamento.aplicar(cliente)

    expect(cliente.alteracoes()).toHaveLength(1)
    const alter = cliente.alteracoes()[0]?.sql ?? ''
    expect(alter).toContain('ALTER TABLE `equipamento`')
    expect(alter).toContain(ALTER)
    expect(alter.toUpperCase()).not.toContain('IF NOT EXISTS')
  })

  it('faz backfill de NULL e string vazia com parâmetro', async () => {
    const cliente = new ClienteBancoFalso(false)

    await migracaoDisponibilidadeEquipamento.aplicar(cliente)

    const backfill = cliente.backfills()[0]
    expect(backfill?.sql).toContain('SET `disponibilidade` = ?')
    expect(backfill?.sql).toContain('`disponibilidade` IS NULL')
    expect(backfill?.sql).toContain("TRIM(`disponibilidade`) = ''")
    expect(backfill?.valores).toEqual(['Disponível'])
  })

  it('não altera a tabela quando a coluna foi criada manualmente, mas ainda faz backfill', async () => {
    const cliente = new ClienteBancoFalso(true, 'COLUMN_NAME')

    await migracaoDisponibilidadeEquipamento.aplicar(cliente)

    expect(cliente.alteracoes()).toEqual([])
    expect(cliente.backfills()).toHaveLength(1)
  })

  it('é idempotente: a segunda execução não repete o ALTER', async () => {
    const cliente = new ClienteBancoFalso(false)

    await migracaoDisponibilidadeEquipamento.aplicar(cliente)
    await migracaoDisponibilidadeEquipamento.aplicar(cliente)

    expect(cliente.alteracoes()).toHaveLength(1)
    expect(cliente.backfills()).toHaveLength(2)
  })
})
