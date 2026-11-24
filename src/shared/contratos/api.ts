import type {
  AppInfo,
  Categoria,
  Cliente,
  CriarCheckoutStripePayload,
  Equipamento,
  ListarClientesRequisicao,
  PingPayload,
  Reserva,
  SessaoCheckoutStripe,
} from './modelos'

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void
  categorias: { listar(): Promise<Categoria[]> }
  clientes: { listar(params?: ListarClientesRequisicao): Promise<Cliente[]> }
  equipamentos: { listar(): Promise<Equipamento[]> }
  reservas: { listar(): Promise<Reserva[]> }
  stripe: { criarCheckout(payload: CriarCheckoutStripePayload): Promise<SessaoCheckoutStripe> }
}

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}
