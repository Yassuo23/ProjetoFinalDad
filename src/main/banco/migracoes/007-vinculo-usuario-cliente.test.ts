import { describe, expect, it } from 'vitest'
import type { ParametroSql, RegistroBanco, ResultadoEscrita } from '../ClienteBanco'
import type { ClienteMigracao } from '../Migrador'
import { MIGRACOES } from '.'
import { migracaoVinculoUsuarioCliente } from './007-vinculo-usuario-cliente'

const SUCESSO: ResultadoEscrita = { insertId: 0, afetadas: 0 }

interface Chamada {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

class ClienteMigracaoFalso implements ClienteMigracao {
  readonly chamadas: Chamada[] = []

  constructor(
    private readonly colunas: readonly RegistroBanco[] = [],
    private readonly restricoes: readonly RegistroBanco[] = [],
  ) {}

  async query(sql: string, valores: readonly ParametroSql[] = []): Promise<RegistroBanco[]> {
    this.chamadas.push({ sql, valores })
    if (sql.includes('information_schema.columns')) return [...this.colunas]
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

  alters(): readonly string[] {
    return this.chamadas.filter(({ sql }) => sql.includes('ALTER TABLE')).map(({ sql }) => sql)
  }
}

describe('migração 007 — vínculo usuario → cliente', () => {
  it('é aditiva depois da 006', () => {
    expect(MIGRACOES.map((migracao) => migracao.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(migracaoVinculoUsuarioCliente.id).toBe(7)
  })

  it('cria coluna unique e FK em uma única alteração parametrizada', async () => {
    const cliente = new ClienteMigracaoFalso()

    await migracaoVinculoUsuarioCliente.aplicar(cliente)

    expect(cliente.alters()).toHaveLength(1)
    const sql = cliente.alters()[0] ?? ''
    expect(sql).toContain('ADD COLUMN `id_usuario` INT NULL UNIQUE')
    expect(sql).toContain('FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)')
    expect(sql).toContain('ON DELETE SET NULL')
    const consulta = cliente.chamadas.find(({ sql: texto }) => texto.includes('information_schema.columns'))
    expect(consulta?.valores).toEqual(['cliente', 'id_usuario'])
  })

  it('não altera nada quando coluna e FK já existem', async () => {
    const cliente = new ClienteMigracaoFalso(
      [{ COLUMN_NAME: 'ID_USUARIO' }],
      [{ restricao: 'FK_CLIENTE_USUARIO' }],
    )

    await migracaoVinculoUsuarioCliente.aplicar(cliente)
    await migracaoVinculoUsuarioCliente.aplicar(cliente)

    expect(cliente.alters()).toHaveLength(0)
  })

  it('acrescenta somente a FK quando a coluna já existe', async () => {
    const cliente = new ClienteMigracaoFalso([{ coluna: 'id_usuario' }])

    await migracaoVinculoUsuarioCliente.aplicar(cliente)

    expect(cliente.alters()).toHaveLength(1)
    expect(cliente.alters()[0]).toContain('ADD CONSTRAINT `fk_cliente_usuario`')
    expect(cliente.alters()[0]).not.toContain('ADD COLUMN')
  })
})
