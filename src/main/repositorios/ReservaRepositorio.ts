import type { DatabaseSync } from 'node:sqlite'

/** Porta usada pelo serviço de disponibilidade; implementação trocável nos testes. */
export interface RepositorioReservas {
  existeSobreposicao(equipamentoId: number, inicio: string, fim: string): boolean
}

/** Acesso a dados de reservas. Não decide disponibilidade: apenas conta interseções. */
export class ReservaRepositorio implements RepositorioReservas {
  constructor(private readonly db: DatabaseSync) {}

  existeSobreposicao(equipamentoId: number, inicio: string, fim: string): boolean {
    const linha = this.db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM reservas
        WHERE status IN ('pendente', 'confirmada')
          AND equipamento_id = ?
          AND inicio < ?
          AND fim > ?
      `)
      .get(equipamentoId, fim, inicio)
    return Number(linha?.total ?? 0) > 0
  }
}
