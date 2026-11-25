import type {
  AppInfo,
  Categoria,
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
  EnderecoCep,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  ChaveItemReservaEntrada,
  ItemReserva,
  ItemReservaAtualizarEntrada,
  ItemReservaCriarEntrada,
  ItemReservaListarFiltros,
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedorListarFiltros,
  IdEntrada,
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  PagamentoListarFiltros,
  PeriodoEntrada,
  PingPayload,
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
} from './modelos'

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void

  categorias: {
    listar(): Promise<Categoria[]>
  }

  fornecedores: {
    listar(filtros?: FornecedorListarFiltros): Promise<Fornecedor[]>
    buscarPorId(id: number): Promise<Fornecedor>
    criar(dados: FornecedorCriarEntrada): Promise<Fornecedor>
    atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor>
    inativar(id: number): Promise<void>
  }

  clientes: {
    listar(filtros?: ClienteListarFiltros): Promise<Cliente[]>
    buscarPorId(id: number): Promise<Cliente>
    buscarCep(cep: string): Promise<EnderecoCep>
    criar(dados: ClienteCriarEntrada): Promise<Cliente>
    atualizar(dados: ClienteAtualizarEntrada): Promise<Cliente>
    inativar(id: number): Promise<void>
  }

  equipamentos: {
    listar(filtros?: EquipamentoListarFiltros): Promise<Equipamento[]>
    buscarPorId(id: number): Promise<Equipamento>
    listarDisponiveis(periodo: PeriodoEntrada): Promise<Equipamento[]>
    criar(dados: EquipamentoCriarEntrada): Promise<Equipamento>
    atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento>
    inativar(id: number): Promise<void>
  }

  reservas: {
    listar(filtros?: ReservaListarFiltros): Promise<Reserva[]>
    buscarPorId(id: number): Promise<Reserva>
    criar(dados: ReservaCriarEntrada): Promise<Reserva>
    atualizar(dados: ReservaAtualizarEntrada): Promise<Reserva>
    inativar(id: number): Promise<void>
  }

  itensReserva: {
    listar(filtros?: ItemReservaListarFiltros): Promise<ItemReserva[]>
    buscarPorId(chave: ChaveItemReservaEntrada): Promise<ItemReserva>
    criar(dados: ItemReservaCriarEntrada): Promise<ItemReserva>
    atualizar(dados: ItemReservaAtualizarEntrada): Promise<ItemReserva>
    remover(chave: ChaveItemReservaEntrada): Promise<void>
  }

  pagamentos: {
    listar(filtros?: PagamentoListarFiltros): Promise<Pagamento[]>
    buscarPorId(id: number): Promise<Pagamento>
    criar(dados: PagamentoCriarEntrada): Promise<Pagamento>
    atualizar(dados: PagamentoAtualizarEntrada): Promise<Pagamento>
    inativar(id: number): Promise<void>
  }

  devolucoes: {
    listar(filtros?: DevolucaoListarFiltros): Promise<Devolucao[]>
    buscarPorId(id: number): Promise<Devolucao>
    criar(dados: DevolucaoCriarEntrada): Promise<Devolucao>
    atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao>
    inativar(id: number): Promise<void>
  }
}

/** Payload dos canais que recebem apenas `{ id }`. */
export type EntradaPorId = IdEntrada

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}
