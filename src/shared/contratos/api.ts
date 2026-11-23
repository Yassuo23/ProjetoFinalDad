import type {
  AppInfo,
  Categoria,
  Cliente,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoDisponiveisEntrada,
  EquipamentoListarFiltros,
  PingPayload,
  Reserva,
} from './modelos'

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void
  categorias: { listar(): Promise<Categoria[]> }
  clientes: { listar(): Promise<Cliente[]> }
  equipamentos: {
    listar(filtros?: EquipamentoListarFiltros): Promise<Equipamento[]>
    buscarPorId(id: number): Promise<Equipamento>
    criar(dados: EquipamentoCriarEntrada): Promise<Equipamento>
    atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento>
    inativar(id: number): Promise<void>
    listarDisponiveis(periodo: EquipamentoDisponiveisEntrada): Promise<Equipamento[]>
  }
  reservas: { listar(): Promise<Reserva[]> }
}

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}
