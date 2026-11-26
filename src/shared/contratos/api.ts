import type {
  AppInfo,
  AutenticarEntrada,
  BootstrapEntrada,
  CadastrarClienteEntrada,
  CalculoMulta,
  CalculoMultaEntrada,
  Categoria,
  CategoriaAtualizarEntrada,
  CategoriaCriarEntrada,
  CategoriaDetalhe,
  CategoriaListarFiltros,
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
  DevolucaoPendente,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  EstadoSessao,
  ChaveItemReservaEntrada,
  FeriadosEntrada,
  ItemReserva,
  ItemReservaAtualizarEntrada,
  ItemReservaCriarEntrada,
  ItemReservaListarFiltros,
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedorListarFiltros,
  IdEntrada,
  OrdemManutencao,
  OrdemManutencaoAtualizarEntrada,
  OrdemManutencaoCriarEntrada,
  OrdemManutencaoConcluirEntrada,
  OrdemManutencaoListarFiltros,
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  PagamentoListarFiltros,
  PeriodoEntrada,
  PingPayload,
  PrevisaoTempoEntrada,
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
  RespostaCep,
  RespostaCnpj,
  RespostaFeriados,
  RespostaPrevisaoTempo,
  ResumoDashboard,
  ResumoDashboardEntrada,
  Sessao,
  UsuarioAlterarSenhaEntrada,
  UsuarioAtualizarEntrada,
  UsuarioCriarEntrada,
  UsuarioListarFiltros,
  UsuarioPublico,
} from './modelos'

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void

  /** Sessão em memória no main; nenhum segredo atravessa o IPC. */
  auth: {
    entrar(dados: AutenticarEntrada): Promise<Sessao>
    sair(): Promise<void>
    sessaoAtual(): Promise<EstadoSessao>
    /** Primeira execução: senha escolhida pelo usuário, sem credencial fixa. */
    bootstrap(dados: BootstrapEntrada): Promise<Sessao>
    /**
     * ADR 0009: auto-cadastro público; o payload não tem `perfil`. O main fixa
     * `'Cliente'` e devolve a sessão já autenticada com `clienteId` preenchido.
     */
    cadastrarCliente(dados: CadastrarClienteEntrada): Promise<Sessao>
  }

  /** Operações exclusivas de administrador (autorização conferida no main). */
  usuarios: {
    listar(filtros?: UsuarioListarFiltros): Promise<UsuarioPublico[]>
    buscarPorId(id: number): Promise<UsuarioPublico>
    criar(dados: UsuarioCriarEntrada): Promise<UsuarioPublico>
    atualizar(dados: UsuarioAtualizarEntrada): Promise<UsuarioPublico>
    inativar(id: number): Promise<void>
    alterarSenha(dados: UsuarioAlterarSenhaEntrada): Promise<void>
  }

  categorias: {
    listar(filtros?: CategoriaListarFiltros): Promise<Categoria[]>
    buscarPorId(id: number): Promise<CategoriaDetalhe>
    criar(dados: CategoriaCriarEntrada): Promise<CategoriaDetalhe>
    atualizar(dados: CategoriaAtualizarEntrada): Promise<CategoriaDetalhe>
    inativar(id: number): Promise<void>
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
    buscarCep(cep: string): Promise<RespostaCep>
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
    listarPendentes(data?: string): Promise<DevolucaoPendente[]>
    calcularMulta(dados: CalculoMultaEntrada): Promise<CalculoMulta>
    criar(dados: DevolucaoCriarEntrada): Promise<Devolucao>
    atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao>
    inativar(id: number): Promise<void>
  }

  /** Admin abre/conclui; atendente consulta status. */
  manutencao: {
    listar(filtros?: OrdemManutencaoListarFiltros): Promise<OrdemManutencao[]>
    buscarPorId(id: number): Promise<OrdemManutencao>
    criar(dados: OrdemManutencaoCriarEntrada): Promise<OrdemManutencao>
    atualizar(dados: OrdemManutencaoAtualizarEntrada): Promise<OrdemManutencao>
    concluir(dados: OrdemManutencaoConcluirEntrada): Promise<OrdemManutencao>
    inativar(id: number): Promise<void>
  }

  /** Um canal por integração; indisponibilidade é valor de retorno. */
  integracoes: {
    previsaoTempo(entrada: PrevisaoTempoEntrada): Promise<RespostaPrevisaoTempo>
    cnpj(cnpj: string): Promise<RespostaCnpj>
    feriados(entrada: FeriadosEntrada): Promise<RespostaFeriados>
  }

  dashboard: {
    resumo(entrada?: ResumoDashboardEntrada): Promise<ResumoDashboard>
  }
}

/** Payload dos canais que recebem apenas `{ id }`. */
export type EntradaPorId = IdEntrada

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}
