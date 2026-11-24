import type { DatabaseSync } from 'node:sqlite'
import type {
  Reserva,
  ReservaCriarEntrada,
  ReservasListarFiltros,
  StatusReserva,
} from '../../shared/contratos/modelos'

/** Porta usada pelos serviços; implementação trocável nos testes. */
export interface RepositorioReservas {
  listar(filtros?: ReservasListarFiltros): Reserva[]
  buscarPorId(id: number): Reserva | null
  criar(dados: ReservaCriarEntrada): Reserva
  confirmar(id: number): Reserva | null
  cancelar(id: number): boolean
  existeSobreposicao(equipamentoId: number, inicio: string, fim: string): boolean
}

const STATUS_RESERVA: readonly string[] = ['pendente', 'confirmada', 'cancelada', 'concluida']

const COLUNAS = `
  id,
  cliente_id AS clienteId,
  equipamento_id AS equipamentoId,
  inicio,
  fim,
  status,
  local_atividade AS localAtividade,
  criado_em AS criadoEm
`

/** Acesso a dados de reservas. SQL sempre parametrizado; nenhuma regra de negócio. */
export class ReservaRepositorio implements RepositorioReservas {
  constructor(private readonly db: DatabaseSync) {}

  listar(filtros: ReservasListarFiltros = {}): Reserva[] {
    const linhas = this.db
      .prepare(`
        SELECT ${COLUNAS}
        FROM reservas
        WHERE cliente_id = COALESCE(?, cliente_id)
          AND equipamento_id = COALESCE(?, equipamento_id)
          AND status = COALESCE(?, status)
        ORDER BY inicio DESC
      `)
      .all(filtros.clienteId ?? null, filtros.equipamentoId ?? null, filtros.status ?? null)
    return linhas.map((linha) => paraReserva(linha))
  }

  buscarPorId(id: number): Reserva | null {
    const linha = this.db.prepare(`SELECT ${COLUNAS} FROM reservas WHERE id = ?`).get(id)
    return linha ? paraReserva(linha) : null
  }

  criar(dados: ReservaCriarEntrada): Reserva {
    const resultado = this.db
      .prepare(`
        INSERT INTO reservas (cliente_id, equipamento_id, inicio, fim, status, local_atividade)
        VALUES (?, ?, ?, ?, 'pendente', ?)
      `)
      .run(
        dados.clienteId,
        dados.equipamentoId,
        dados.inicio,
        dados.fim,
        dados.localAtividade,
      )

    const criado = this.buscarPorId(Number(resultado.lastInsertRowid))
    if (!criado) throw new Error('RESERVA_LINHA_INVALIDA')
    return criado
  }

  confirmar(id: number): Reserva | null {
    const resultado = this.db
      .prepare("UPDATE reservas SET status = 'confirmada' WHERE id = ?")
      .run(id)
    return resultado.changes > 0 ? this.buscarPorId(id) : null
  }

  cancelar(id: number): boolean {
    const resultado = this.db
      .prepare("UPDATE reservas SET status = 'cancelada' WHERE id = ?")
      .run(id)
    return resultado.changes > 0
  }

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

function ehInteiro(valor: unknown): valor is number | bigint {
  return typeof valor === 'number' || typeof valor === 'bigint'
}

function ehStatus(valor: unknown): valor is StatusReserva {
  return typeof valor === 'string' && STATUS_RESERVA.includes(valor)
}

function paraReserva(linha: Record<string, unknown>): Reserva {
  const {
    id,
    clienteId,
    equipamentoId,
    inicio,
    fim,
    status,
    localAtividade,
    criadoEm,
  } = linha

  const criadoValido =
    typeof criadoEm === 'string' || typeof criadoEm === 'number' || typeof criadoEm === 'bigint'
  const localValido = localAtividade === null || typeof localAtividade === 'string'

  if (
    !ehInteiro(id) ||
    !ehInteiro(clienteId) ||
    !ehInteiro(equipamentoId) ||
    typeof inicio !== 'string' ||
    typeof fim !== 'string' ||
    !ehStatus(status) ||
    !localValido ||
    !criadoValido
  ) {
    throw new Error('RESERVA_LINHA_INVALIDA')
  }

  return {
    id: Number(id),
    clienteId: Number(clienteId),
    equipamentoId: Number(equipamentoId),
    inicio,
    fim,
    status,
    localAtividade,
    criadoEm: String(criadoEm),
  }
}
