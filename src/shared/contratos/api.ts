import type {
  AppInfo,
  Categoria,
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClientesListarFiltros,
  MultaCalcularEntrada,
  ConsultarCepEntrada,
  CalculoMulta,
  Devolucao,
  DevolucaoRegistrarEntrada,
  DisponibilidadeResultado,
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
  PrevisaoTempoEntrada,
  Reserva,
  ReservaCriarEntrada,
  ReservasListarFiltros,
  VerificarDisponibilidadeEntrada,
} from './modelos'

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void
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
}

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}
