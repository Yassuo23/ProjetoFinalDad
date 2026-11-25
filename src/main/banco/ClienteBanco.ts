/**
 * Porta de acesso ao MySQL usada por repositórios e migrações.
 *
 * Tipos próprios (em vez de `RowDataPacket`/`ResultSetHeader` do mysql2) mantêm
 * o domínio desacoplado do driver e permitem fakes nos testes.
 */

export type ParametroSql = string | number | bigint | Date | null

export type RegistroBanco = Readonly<Record<string, unknown>>

export interface ResultadoEscrita {
  readonly insertId: number
  readonly afetadas: number
}

export interface ClienteBanco {
  query(sql: string, valores?: readonly ParametroSql[]): Promise<readonly RegistroBanco[]>
  execute(sql: string, valores?: readonly ParametroSql[]): Promise<ResultadoEscrita>
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
}
