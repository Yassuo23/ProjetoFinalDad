import type { DatabaseSync } from 'node:sqlite'
import type {
  Pagamento,
  PagamentoRegistrarEntrada,
  PagamentosListarFiltros,
} from '../../shared/contratos/modelos'

/** Porta usada pelo serviço; implementação trocável nos testes. */
export interface RepositorioPagamentos {
  listar(filtros?: PagamentosListarFiltros): Pagamento[]
  buscarPorReserva(reservaId: number): Pagamento | null
  buscarPorId(id: number): Pagamento | null
  criar(dados: PagamentoRegistrarEntrada): Pagamento
  confirmar(id: number): Pagamento | null
  estornar(id: number): Pagamento | null
  existeParaReserva(reservaId: number): boolean
}

const COLUNAS = `
  id,
  reserva_id AS reservaId,
  valor,
  forma,
  status,
  pago_em AS pagoEm,
  criado_em AS criadoEm
`

/** Acesso a dados de pagamentos. SQL sempre parametrizado; nenhuma regra de negócio. */
export class PagamentoRepositorio implements RepositorioPagamentos {
  constructor(private readonly db: DatabaseSync) {}

  listar(filtros: PagamentosListarFiltros = {}): Pagamento[] {
    const linhas = this.db
      .prepare(
        `
        SELECT ${COLUNAS}
        FROM pagamentos
        WHERE reserva_id = COALESCE(?, reserva_id)
          AND status = COALESCE(?, status)
        ORDER BY criado_em DESC, id DESC
      `,
      )
      .all(filtros.reservaId ?? null, filtros.status ?? null)
    return linhas.map((linha) => paraPagamento(linha))
  }

  buscarPorReserva(reservaId: number): Pagamento | null {
    const linha = this.db
      .prepare(`SELECT ${COLUNAS} FROM pagamentos WHERE reserva_id = ?`)
      .get(reservaId)
    return linha ? paraPagamento(linha) : null
  }

  buscarPorId(id: number): Pagamento | null {
    const linha = this.db.prepare(`SELECT ${COLUNAS} FROM pagamentos WHERE id = ?`).get(id)
    return linha ? paraPagamento(linha) : null
  }

  criar(dados: PagamentoRegistrarEntrada): Pagamento {
    this.db
      .prepare(
        `
        INSERT INTO pagamentos (reserva_id, valor, forma, status, pago_em)
        VALUES (?, ?, ?, 'pendente', NULL)
      `,
      )
      .run(dados.reservaId, dados.valor, dados.forma)

    const criado = this.buscarPorReserva(dados.reservaId)
    if (!criado) throw new Error('PAGAMENTO_LINHA_INVALIDA')
    return criado
  }

  confirmar(id: number): Pagamento | null {
    const resultado = this.db
      .prepare(
        `
        UPDATE pagamentos SET status = 'pago', pago_em = datetime('now')
        WHERE id = ? AND status = 'pendente'
      `,
      )
      .run(id)
    return resultado.changes > 0 ? this.buscarPorId(id) : null
  }

  estornar(id: number): Pagamento | null {
    const resultado = this.db
      .prepare(`UPDATE pagamentos SET status = 'estornado' WHERE id = ? AND status = 'pago'`)
      .run(id)
    return resultado.changes > 0 ? this.buscarPorId(id) : null
  }

  existeParaReserva(reservaId: number): boolean {
    const linha = this.db
      .prepare('SELECT COUNT(*) AS total FROM pagamentos WHERE reserva_id = ?')
      .get(reservaId)
    return Number(linha?.total ?? 0) > 0
  }
}

function ehNumerico(valor: unknown): valor is number | bigint {
  return typeof valor === 'number' || typeof valor === 'bigint'
}

function ehTexto(valor: unknown): valor is string | number | bigint {
  return typeof valor === 'string' || ehNumerico(valor)
}

function ehForma(valor: unknown): valor is Pagamento['forma'] {
  return (
    typeof valor === 'string' &&
    ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'].includes(valor)
  )
}

function ehStatus(valor: unknown): valor is Pagamento['status'] {
  return typeof valor === 'string' && ['pendente', 'pago', 'estornado'].includes(valor)
}

function paraPagamento(linha: Record<string, unknown>): Pagamento {
  const { id, reservaId, valor, forma, status, pagoEm, criadoEm } = linha

  if (
    !ehNumerico(id) ||
    !ehNumerico(reservaId) ||
    !ehNumerico(valor) ||
    !ehForma(forma) ||
    !ehStatus(status) ||
    (pagoEm !== null && !ehTexto(pagoEm)) ||
    !ehTexto(criadoEm)
  ) {
    throw new Error('PAGAMENTO_LINHA_INVALIDA')
  }

  return {
    id: Number(id),
    reservaId: Number(reservaId),
    valor: Number(valor),
    forma,
    status,
    pagoEm: pagoEm === null ? null : String(pagoEm),
    criadoEm: String(criadoEm),
  }
}
