/** Tipos de domínio compartilhados. Só `type`/`interface`: somem no build. */

export interface AppInfo {
  name: string
  version: string
  electron: string
  node: string
  platform: string
  arch: string
}

export interface PingPayload {
  message: string
  timestamp: number
}

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
}

export interface Cliente {
  id: number
  nome: string
  email: string | null
  telefone: string | null
}

export interface Equipamento {
  id: number
  nome: string
  categoriaId: number
  precoDiaria: number
  disponivel: boolean
}

export type StatusReserva = 'pendente' | 'confirmada' | 'cancelada' | 'concluida'

export interface Reserva {
  id: number
  clienteId: number
  equipamentoId: number
  inicio: string
  fim: string
  status: StatusReserva
}
