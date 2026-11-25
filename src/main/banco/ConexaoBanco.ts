import { createPool } from 'mysql2/promise'
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type {
  ClienteBanco,
  ParametroSql,
  RegistroBanco,
  ResultadoEscrita,
} from './ClienteBanco'

class ClienteMysql implements ClienteBanco {
  constructor(private readonly conexao: PoolConnection) {}

  async query(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<readonly RegistroBanco[]> {
    const [linhas] = await this.conexao.query<RowDataPacket[]>(sql, [...valores])
    return linhas.map((linha) => ({ ...linha }) as RegistroBanco)
  }

  async execute(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<ResultadoEscrita> {
    const [resultado] = await this.conexao.execute<ResultSetHeader>(sql, [...valores])
    return { insertId: Number(resultado.insertId), afetadas: resultado.affectedRows }
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

  constructor(configuracao: Parameters<typeof createPool>[0]) {
    this.pool = createPool(configuracao)
  }

  async obterCliente(): Promise<{ cliente: ClienteBanco; liberar: () => void }> {
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
