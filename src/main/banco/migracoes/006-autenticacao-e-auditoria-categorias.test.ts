import { describe, expect, it } from 'vitest'
import type { ParametroSql, RegistroBanco, ResultadoEscrita } from '../ClienteBanco'
import type { ClienteMigracao } from '../Migrador'
import { MIGRACOES } from '.'
import { migracaoAutenticacaoCategorias } from './006-autenticacao-e-auditoria-categorias'

const SUCESSO: ResultadoEscrita = { insertId: 0, afetadas: 0 }

interface Chamada {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

class ClienteMigracaoFalso implements ClienteMigracao {
  readonly chamadas: Chamada[] = []

  constructor(private readonly colunasExistentes: readonly string[] = []) {}

  async query(sql: string, valores: readonly ParametroSql[] = []): Promise<RegistroBanco[]> {
    this.chamadas.push({ sql, valores })
    if (!sql.includes('information_schema')) return []
    return this.colunasExistentes.map((coluna) => ({ coluna }))
  }

  async execute(sql: string, valores: readonly ParametroSql[] = []): Promise<ResultadoEscrita> {
    this.chamadas.push({ sql, valores })
    return SUCESSO
  }

  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}

  contem(trecho: string): boolean {
    return this.chamadas.some(({ sql }) => sql.includes(trecho))
  }
}

describe('migração 006 — autenticação e auditoria de categorias', () => {
  it('é a continuação aditiva de 005', () => {
    expect(MIGRACOES.map((migracao) => migracao.id)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(migracaoAutenticacaoCategorias.id).toBe(6)
  })

  it('cria usuario com login único e sem credencial semeada', async () => {
    const cliente = new ClienteMigracaoFalso()

    await migracaoAutenticacaoCategorias.aplicar(cliente)

    const criacao = cliente.chamadas.find(({ sql }) => sql.includes('CREATE TABLE IF NOT EXISTS usuario'))
    expect(criacao?.sql).toContain('login VARCHAR(80) NOT NULL UNIQUE')
    expect(criacao?.sql).toContain('senha_hash VARCHAR(255) NOT NULL')
    expect(criacao?.sql).toContain("perfil VARCHAR(20) NOT NULL")
    expect(criacao?.sql).toContain('ativo TINYINT(1) NOT NULL DEFAULT 1')
    expect(cliente.contem('INSERT INTO usuario')).toBe(false)
  })

  it('adiciona colunas de auditoria em categorias quando faltam', async () => {
    const cliente = new ClienteMigracaoFalso()

    await migracaoAutenticacaoCategorias.aplicar(cliente)

    const alter = cliente.chamadas.find(({ sql }) => sql.includes('ALTER TABLE `categorias`'))
    expect(alter?.sql).toContain('ADD COLUMN `ativo` TINYINT(1) NOT NULL DEFAULT 1')
    expect(alter?.sql).toContain('ADD COLUMN `atualizado_em` TIMESTAMP')
    const consulta = cliente.chamadas.find(({ sql }) => sql.includes('information_schema'))
    expect(consulta?.valores).toEqual(['categorias', 'ativo', 'atualizado_em'])
  })

  it('não altera categorias quando as colunas já existem (idempotente)', async () => {
    const cliente = new ClienteMigracaoFalso(['ATIVO', 'ATUALIZADO_EM'])

    await migracaoAutenticacaoCategorias.aplicar(cliente)
    await migracaoAutenticacaoCategorias.aplicar(cliente)

    expect(cliente.contem('ALTER TABLE')).toBe(false)
    expect(cliente.chamadas.filter(({ sql }) => sql.includes('CREATE TABLE IF NOT EXISTS usuario'))).toHaveLength(2)
  })
})
