import { createPool } from 'mysql2/promise'
import type { Pool, PoolConnection, PoolOptions, RowDataPacket } from 'mysql2/promise'
import type { ClienteMigracao } from './Migrador'

type ParametroSql = string | number | null

class ClienteMysql implements ClienteMigracao {
  constructor(private readonly conexao: PoolConnection) {}

  async query(sql: string): Promise<Array<{ id: number }>> {
    const [linhas] = await this.conexao.query<RowDataPacket[]>(sql)
    return linhas.map((linha) => ({ id: Number(linha.id) }))
  }

  async execute(sql: string, valores?: ParametroSql[]): Promise<void> {
    await this.conexao.execute(sql, valores)
  }

  beginTransaction(): Promise<void> {
    return this.conexao.beginTransaction()
  }

  commit(): Promise<void> {
    return this.conexao.commit()
  }

  rollback(): Promise<void> {
    return this.conexao.rollback()
  }
}

export class ConexaoBanco {
  private readonly pool: Pool

  constructor(configuracao: PoolOptions) {
    this.pool = createPool(configuracao)
  }

  async obterCliente(): Promise<{ cliente: ClienteMigracao; liberar: () => void }> {
    const conexao = await this.pool.getConnection()
    return {
      cliente: new ClienteMysql(conexao),
      liberar: () => conexao.release(),
    }
  }

  fechar(): Promise<void> {
    return this.pool.end()
  }
}
