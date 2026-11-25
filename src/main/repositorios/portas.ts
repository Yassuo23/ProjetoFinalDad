import type {
  Categoria,
  ChaveItemReservaEntrada,
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedorListarFiltros,
  ItemReserva,
  ItemReservaAtualizarEntrada,
  ItemReservaCriarEntrada,
  ItemReservaListarFiltros,
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  PagamentoListarFiltros,
  PeriodoEntrada,
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
} from '../../shared/contratos/modelos'

/** Efeitos calculados pelo serviço e aplicados atomicamente pelo repositório. */
export interface EfeitosDevolucao {
  readonly valorMulta: number
  readonly manutencao: boolean
}

export interface RepositorioCategorias {
  listar(): Promise<readonly Categoria[]>
}

export interface RepositorioFornecedores {
  listar(filtros?: FornecedorListarFiltros): Promise<readonly Fornecedor[]>
  buscarPorId(id: number): Promise<Fornecedor | null>
  criar(dados: FornecedorCriarEntrada): Promise<Fornecedor>
  atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor | null>
  inativar(id: number): Promise<boolean>
  cnpjEmUso(cnpj: string, idExcluido?: number): Promise<boolean>
}

export interface RepositorioClientes {
  listar(filtros?: ClienteListarFiltros): Promise<readonly Cliente[]>
  buscarPorId(id: number): Promise<Cliente | null>
  criar(dados: ClienteCriarEntrada): Promise<Cliente>
  atualizar(dados: ClienteAtualizarEntrada): Promise<Cliente | null>
  inativar(id: number): Promise<boolean>
  cpfEmUso(cpf: string, idExcluido?: number): Promise<boolean>
}

export interface RepositorioEquipamentos {
  listar(filtros?: EquipamentoListarFiltros): Promise<readonly Equipamento[]>
  buscarPorId(id: number): Promise<Equipamento | null>
  criar(dados: EquipamentoCriarEntrada): Promise<Equipamento>
  atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento | null>
  inativar(id: number): Promise<boolean>
  listarDisponiveis(periodo: PeriodoEntrada): Promise<readonly Equipamento[]>
  nomeEmUso(nome: string, idExcluido?: number): Promise<boolean>
}

export interface RepositorioReservas {
  listar(filtros?: ReservaListarFiltros): Promise<readonly Reserva[]>
  buscarPorId(id: number): Promise<Reserva | null>
  criar(dados: ReservaCriarEntrada): Promise<Reserva>
  atualizar(dados: ReservaAtualizarEntrada): Promise<Reserva | null>
  inativar(id: number): Promise<boolean>
}

export interface RepositorioItensReserva {
  listar(filtros?: ItemReservaListarFiltros): Promise<readonly ItemReserva[]>
  buscarPorId(chave: ChaveItemReservaEntrada): Promise<ItemReserva | null>
  criar(dados: ItemReservaCriarEntrada): Promise<ItemReserva>
  atualizar(dados: ItemReservaAtualizarEntrada): Promise<ItemReserva | null>
  remover(chave: ChaveItemReservaEntrada): Promise<boolean>
}

export interface RepositorioPagamentos {
  listar(filtros?: PagamentoListarFiltros): Promise<readonly Pagamento[]>
  buscarPorId(id: number): Promise<Pagamento | null>
  criar(dados: PagamentoCriarEntrada): Promise<Pagamento>
  atualizar(dados: PagamentoAtualizarEntrada): Promise<Pagamento | null>
  inativar(id: number): Promise<boolean>
}

export interface RepositorioDevolucoes {
  listar(filtros?: DevolucaoListarFiltros): Promise<readonly Devolucao[]>
  buscarPorId(id: number): Promise<Devolucao | null>
  buscarPorReserva(reservaId: number): Promise<Devolucao | null>
  criarComEfeitos(dados: DevolucaoCriarEntrada, efeitos: EfeitosDevolucao): Promise<Devolucao>
  atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao | null>
  inativar(id: number): Promise<boolean>
}
