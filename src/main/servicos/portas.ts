import type {
  ChaveItemReservaEntrada,
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

/** Portas usadas pelos handlers — permitem testar sem Electron e sem banco. */
export interface ServicoCategorias {
  listar(): Promise<readonly { id: number; nome: string; descricao: string | null }[]>
}

export interface ServicoFornecedores {
  listar(filtros?: FornecedorListarFiltros): Promise<readonly Fornecedor[]>
  buscarPorId(id: number): Promise<Fornecedor>
  criar(dados: FornecedorCriarEntrada): Promise<Fornecedor>
  atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor>
  inativar(id: number): Promise<void>
}

export interface ServicoClientes {
  listar(filtros?: ClienteListarFiltros): Promise<readonly Cliente[]>
  buscarPorId(id: number): Promise<Cliente>
  buscarCep(cep: string): Promise<EnderecoCep>
  criar(dados: ClienteCriarEntrada): Promise<Cliente>
  atualizar(dados: ClienteAtualizarEntrada): Promise<Cliente>
  inativar(id: number): Promise<void>
}

export interface ServicoEquipamentos {
  listar(filtros?: EquipamentoListarFiltros): Promise<readonly Equipamento[]>
  buscarPorId(id: number): Promise<Equipamento>
  listarDisponiveis(periodo: PeriodoEntrada): Promise<readonly Equipamento[]>
  criar(dados: EquipamentoCriarEntrada): Promise<Equipamento>
  atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento>
  inativar(id: number): Promise<void>
}

export interface ServicoReservas {
  listar(filtros?: ReservaListarFiltros): Promise<readonly Reserva[]>
  buscarPorId(id: number): Promise<Reserva>
  criar(dados: ReservaCriarEntrada): Promise<Reserva>
  atualizar(dados: ReservaAtualizarEntrada): Promise<Reserva>
  inativar(id: number): Promise<void>
}

export interface ServicoItensReserva {
  listar(filtros?: ItemReservaListarFiltros): Promise<readonly ItemReserva[]>
  buscarPorId(chave: ChaveItemReservaEntrada): Promise<ItemReserva>
  criar(dados: ItemReservaCriarEntrada): Promise<ItemReserva>
  atualizar(dados: ItemReservaAtualizarEntrada): Promise<ItemReserva>
  remover(chave: ChaveItemReservaEntrada): Promise<void>
}

export interface ServicoPagamentos {
  listar(filtros?: PagamentoListarFiltros): Promise<readonly Pagamento[]>
  buscarPorId(id: number): Promise<Pagamento>
  criar(dados: PagamentoCriarEntrada): Promise<Pagamento>
  atualizar(dados: PagamentoAtualizarEntrada): Promise<Pagamento>
  inativar(id: number): Promise<void>
}

export interface ServicoDevolucoes {
  listar(filtros?: DevolucaoListarFiltros): Promise<readonly Devolucao[]>
  buscarPorId(id: number): Promise<Devolucao>
  criar(dados: DevolucaoCriarEntrada): Promise<Devolucao>
  atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao>
  inativar(id: number): Promise<void>
}

/** Regra de disponibilidade: fora de manutenção e sem reserva confirmada sobreposta. */
export interface ServicoDisponibilidade {
  listarDisponiveis(periodo: PeriodoEntrada): Promise<readonly Equipamento[]>
  validarItens(
    itens: readonly { equipamentoId: number }[],
    periodo: PeriodoEntrada,
  ): Promise<void>
}

export interface ServicoCep {
  buscar(cep: string): Promise<EnderecoCep>
}

export interface ServicoClima {
  resumo(dataInicio: string): Promise<string>
}
