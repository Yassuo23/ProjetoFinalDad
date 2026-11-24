import type { DatabaseSync } from 'node:sqlite'
import type { Devolucao } from '../../shared/contratos/modelos'

/** Porta usada pelo serviço; implementação trocável nos testes. */
export interface RepositorioDevolucoes {
  criar(dados: Omit<Devolucao, 'id'>): Devolucao
  buscarPorReserva(reservaId: number): Devolucao | null
  existeParaReserva(reservaId: number): boolean
}

const COLUNAS = `
  id,
  reserva_id AS reservaId,
  devolvido_em AS devolvidoEm,
  observacoes,
  dias_atraso AS diasAtraso,
  valor_diaria AS valorDiaria,
  valor_multa AS valorMulta
`

/** Acesso a dados de devoluções. SQL sempre parametrizado; nenhuma regra de negócio. */
export class DevolucaoRepositorio implements RepositorioDevolucoes {
  constructor(private readonly db: DatabaseSync) {}

  criar(dados: Omit<Devolucao, 'id'>): Devolucao {
    this.db
      .prepare(`
        INSERT INTO devolucoes
          (reserva_id, devolvido_em, observacoes, dias_atraso, valor_diaria, valor_multa)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        dados.reservaId,
        dados.devolvidoEm,
        dados.observacoes,
        dados.diasAtraso,
        dados.valorDiaria,
        dados.valorMulta,
      )

    const criada = this.buscarPorReserva(dados.reservaId)
    if (!criada) throw new Error('DEVOLUCAO_LINHA_INVALIDA')
    return criada
  }

  buscarPorReserva(reservaId: number): Devolucao | null {
    const linha = this.db
      .prepare(`SELECT ${COLUNAS} FROM devolucoes WHERE reserva_id = ?`)
      .get(reservaId)
    return linha ? paraDevolucao(linha) : null
  }

  existeParaReserva(reservaId: number): boolean {
    const linha = this.db
      .prepare('SELECT COUNT(*) AS total FROM devolucoes WHERE reserva_id = ?')
      .get(reservaId)
    return Number(linha?.total ?? 0) > 0
  }
}

function ehNumerico(valor: unknown): valor is number | bigint {
  return typeof valor === 'number' || typeof valor === 'bigint'
}

function paraDevolucao(linha: Record<string, unknown>): Devolucao {
  const { id, reservaId, devolvidoEm, observacoes, diasAtraso, valorDiaria, valorMulta } = linha
  const observacoesValidas = observacoes === null || typeof observacoes === 'string'

  if (
    !ehNumerico(id) ||
    !ehNumerico(reservaId) ||
    typeof devolvidoEm !== 'string' ||
    !observacoesValidas ||
    !ehNumerico(diasAtraso) ||
    !ehNumerico(valorDiaria) ||
    !ehNumerico(valorMulta)
  ) {
    throw new Error('DEVOLUCAO_LINHA_INVALIDA')
  }

  return {
    id: Number(id),
    reservaId: Number(reservaId),
    devolvidoEm,
    observacoes,
    diasAtraso: Number(diasAtraso),
    valorDiaria: Number(valorDiaria),
    valorMulta: Number(valorMulta),
  }
}
