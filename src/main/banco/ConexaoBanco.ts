import { DatabaseSync } from 'node:sqlite'

/**
 * Conexão SQLite do processo principal.
 *
 * Usa `node:sqlite` (embutido no Node 24 do Electron 45) para não depender de
 * módulo nativo nem de rebuild por ABI. O caminho do arquivo é decidido no main:
 * `app.getPath('userData')/zenite.db`.
 */
export class ConexaoBanco {
  private readonly banco: DatabaseSync

  constructor(caminho: string) {
    this.banco = new DatabaseSync(caminho)
    this.banco.exec('PRAGMA journal_mode = WAL')
    this.banco.exec('PRAGMA foreign_keys = ON')
    this.banco.exec('PRAGMA busy_timeout = 5000')
  }

  get db(): DatabaseSync {
    return this.banco
  }

  fechar(): void {
    this.banco.close()
  }
}
