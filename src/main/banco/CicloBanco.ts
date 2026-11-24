import type { DatabaseSync } from 'node:sqlite'
import type { ConexaoBanco } from './ConexaoBanco'

/** Implementado no main: `app.relaunch()` seguido de `app.exit(0)`. */
export interface ReiniciadorAplicacao {
  reiniciar(): void
}

/**
 * Porta interna do main para o ciclo de vida do banco (ADR 0019).
 * Não é exposta ao renderer: o renderer só fala com os canais de backup.
 */
export interface PortaCicloBanco {
  readonly db: DatabaseSync
  caminhoArquivo(): string
  prepararCopia(): void
  fechar(): void
  solicitarReabertura(): void
}

/** Checkpoint WAL e reabertura no boot — nunca troca o `DatabaseSync` injetado. */
export class CicloBanco implements PortaCicloBanco {
  constructor(
    private readonly conexao: ConexaoBanco,
    private readonly caminho: string,
    private readonly reiniciador: ReiniciadorAplicacao,
  ) {}

  get db(): DatabaseSync {
    return this.conexao.db
  }

  caminhoArquivo(): string {
    return this.caminho
  }

  prepararCopia(): void {
    this.conexao.db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  }

  fechar(): void {
    this.conexao.fechar()
  }

  solicitarReabertura(): void {
    this.reiniciador.reiniciar()
  }
}
