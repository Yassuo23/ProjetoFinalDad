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

/** Cliente do domínio; os campos de endereço atendem ao wireframe 3.4 do `telas.md`. */
export interface Cliente {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}

/** Request tipado de `GET /clientes` (query string da API externa). */
export interface ListarClientesRequisicao {
  readonly busca?: string
  readonly limite?: number
}

/** Response DTO da API de clientes, antes do mapeamento para o domínio. */
export interface RespostaApiClientes {
  readonly dados: readonly Cliente[]
  readonly total: number
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

/** Tipos do checkout Stripe. O renderer nunca recebe campos crus da API do Stripe. */
export type TipoPagamentoCheckout = 'reserva' | 'multa'
export type FormaPagamentoCheckout = 'cartao' | 'pix'

/** Payload enviado do renderer ao main para abrir um checkout hospedado. */
export interface CriarCheckoutStripePayload {
  readonly tipo: TipoPagamentoCheckout
  readonly valorCentavos: number
  readonly descricao: string
  readonly clienteEmail?: string
  readonly forma: FormaPagamentoCheckout
  readonly reservaId?: number
}

/** DTO validado no main antes de cruzar a ponte IPC. */
export interface SessaoCheckoutStripe {
  readonly id: string
  readonly url: string
  readonly status: 'open' | 'complete' | 'expired'
  readonly expiraEm: number
}
