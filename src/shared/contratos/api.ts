import type {
  AppInfo,
  Categoria,
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClientesListarFiltros,
  ConsultarCnpjEntrada,
  DadosCnpj,
  Feriado,
  FeriadoAtualizarEntrada,
  FeriadoCriarEntrada,
  FeriadoImportarEntrada,
  FeriadosListarFiltros,
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedoresListarFiltros,
  ItemPorCategoria,
  ItemReceita,
  Manutencao,
  ManutencaoAbrirEntrada,
  ManutencaoConcluirEntrada,
  ManutencoesListarFiltros,
  MultaCalcularEntrada,
  PainelFiltros,
  ConsultarCepEntrada,
  CalculoMulta,
  Devolucao,
  DevolucaoRegistrarEntrada,
  DisponibilidadeResultado,
  BackupRestaurarEntrada,
  DialogoAbrirEntrada,
  DialogoSalvarEntrada,
  ExportacaoCsvEntrada,
  ResultadoDialogo,
  ResultadoOperacaoArquivo,
  Endereco,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoDisponiveisEntrada,
  EquipamentoListarFiltros,
  Pagamento,
  PagamentoRegistrarEntrada,
  PagamentosListarFiltros,
  PingPayload,
  PrevisaoTempo,
  ResumoPainel,
  PrevisaoTempoEntrada,
  Reserva,
  ReservaCriarEntrada,
  ReservasListarFiltros,
  Usuario,
  UsuarioAtualizarEntrada,
  UsuarioAutenticarEntrada,
  UsuarioCriarEntrada,
  UsuariosListarFiltros,
  VerificarDisponibilidadeEntrada,
} from './modelos'

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void
  arquivos: {
    abrir(entrada?: DialogoAbrirEntrada): Promise<ResultadoDialogo>
    salvar(entrada?: DialogoSalvarEntrada): Promise<ResultadoDialogo>
  }
  backup: {
    /** O main abre o diálogo de salvar; cancelamento devolve `caminho: null`. */
    criar(): Promise<ResultadoOperacaoArquivo>
    /** `caminho` deve ser o retorno de `arquivos.abrir` com filtro `.db`. */
    restaurar(entrada: BackupRestaurarEntrada): Promise<ResultadoOperacaoArquivo>
  }
  exportacao: {
    /** O main escolhe o caminho via diálogo com filtro fixo `.csv`. */
    csv(entrada: ExportacaoCsvEntrada): Promise<ResultadoDialogo>
  }
  categorias: { listar(): Promise<Categoria[]> }
  clientes: {
    listar(filtros?: ClientesListarFiltros): Promise<Cliente[]>
    buscarPorId(id: number): Promise<Cliente>
    criar(dados: ClienteCriarEntrada): Promise<Cliente>
    atualizar(dados: ClienteAtualizarEntrada): Promise<Cliente>
    inativar(id: number): Promise<void>
    consultarCep(entrada: ConsultarCepEntrada): Promise<Endereco>
  }
  equipamentos: {
    listar(filtros?: EquipamentoListarFiltros): Promise<Equipamento[]>
    buscarPorId(id: number): Promise<Equipamento>
    criar(dados: EquipamentoCriarEntrada): Promise<Equipamento>
    atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento>
    inativar(id: number): Promise<void>
    listarDisponiveis(periodo: EquipamentoDisponiveisEntrada): Promise<Equipamento[]>
    verificarDisponibilidade(
      entrada: VerificarDisponibilidadeEntrada,
    ): Promise<DisponibilidadeResultado>
  }
  reservas: {
    listar(filtros?: ReservasListarFiltros): Promise<Reserva[]>
    buscarPorId(id: number): Promise<Reserva>
    criar(dados: ReservaCriarEntrada): Promise<Reserva>
    confirmar(id: number): Promise<Reserva>
    cancelar(id: number): Promise<void>
    previsaoTempo(entrada: PrevisaoTempoEntrada): Promise<PrevisaoTempo>
  }
  devolucoes: {
    registrar(dados: DevolucaoRegistrarEntrada): Promise<Devolucao>
    buscarPorReserva(reservaId: number): Promise<Devolucao>
  }
  multas: { calcular(entrada: MultaCalcularEntrada): Promise<CalculoMulta> }
  pagamentos: {
    listar(filtros?: PagamentosListarFiltros): Promise<Pagamento[]>
    buscarPorReserva(reservaId: number): Promise<Pagamento>
    registrar(dados: PagamentoRegistrarEntrada): Promise<Pagamento>
    confirmar(id: number): Promise<Pagamento>
    estornar(id: number): Promise<Pagamento>
  }
  fornecedores: {
    listar(filtros?: FornecedoresListarFiltros): Promise<Fornecedor[]>
    buscarPorId(id: number): Promise<Fornecedor>
    criar(dados: FornecedorCriarEntrada): Promise<Fornecedor>
    atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor>
    inativar(id: number): Promise<void>
    consultarCnpj(entrada: ConsultarCnpjEntrada): Promise<DadosCnpj>
  }
  manutencoes: {
    listar(filtros?: ManutencoesListarFiltros): Promise<Manutencao[]>
    buscarPorId(id: number): Promise<Manutencao>
    abrir(dados: ManutencaoAbrirEntrada): Promise<Manutencao>
    concluir(dados: ManutencaoConcluirEntrada): Promise<Manutencao>
  }
  feriados: {
    listar(filtros?: FeriadosListarFiltros): Promise<Feriado[]>
    buscarPorId(id: number): Promise<Feriado>
    criar(dados: FeriadoCriarEntrada): Promise<Feriado>
    atualizar(dados: FeriadoAtualizarEntrada): Promise<Feriado>
    remover(id: number): Promise<void>
    importar(dados: FeriadoImportarEntrada): Promise<Feriado[]>
  }
  usuarios: {
    listar(filtros?: UsuariosListarFiltros): Promise<Usuario[]>
    buscarPorId(id: number): Promise<Usuario>
    criar(dados: UsuarioCriarEntrada): Promise<Usuario>
    atualizar(dados: UsuarioAtualizarEntrada): Promise<Usuario>
    inativar(id: number): Promise<void>
    autenticar(entrada: UsuarioAutenticarEntrada): Promise<Usuario>
  }
  painel: {
    resumo(filtros?: PainelFiltros): Promise<ResumoPainel>
    porCategoria(filtros?: PainelFiltros): Promise<ItemPorCategoria[]>
    receita(filtros?: PainelFiltros): Promise<ItemReceita[]>
  }
}

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}
