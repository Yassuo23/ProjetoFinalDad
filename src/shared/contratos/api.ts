import type { AppInfo, Categoria, Cliente, Equipamento, PingPayload, Reserva } from './modelos'

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void
  categorias: { listar(): Promise<Categoria[]> }
  clientes: { listar(): Promise<Cliente[]> }
  equipamentos: { listar(): Promise<Equipamento[]> }
  reservas: { listar(): Promise<Reserva[]> }
}

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}
