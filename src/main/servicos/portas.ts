import type {
  ChaveItemReservaEntrada,
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  AutenticarEntrada,
  BootstrapEntrada,
  CadastrarClienteEntrada,
  Categoria,
  CategoriaAtualizarEntrada,
  CategoriaCriarEntrada,
  CategoriaDetalhe,
  CategoriaListarFiltros,
  DevolucaoListarFiltros,
  EnderecoCep,
  EstadoSessao,
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
  RespostaCnpj,
  RespostaFeriados,
  RespostaPrevisaoTempo,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
  Sessao,
  UsuarioAlterarSenhaEntrada,
  UsuarioAtualizarEntrada,
  UsuarioCriarEntrada,
  UsuarioListarFiltros,
  UsuarioPublico,
} from '../../shared/contratos/modelos'

/** Portas usadas pelos handlers — permitem testar sem Electron e sem banco. */
export interface ServicoCategorias {
  listar(filtros?: CategoriaListarFiltros): Promise<readonly Categoria[]>
  buscarPorId(id: number): Promise<CategoriaDetalhe>
  criar(dados: CategoriaCriarEntrada): Promise<CategoriaDetalhe>
  atualizar(dados: CategoriaAtualizarEntrada): Promise<CategoriaDetalhe>
  inativar(id: number): Promise<void>
}

/** Criptografia de senha: scrypt com salt único; `senha` nunca é logo/erro/IPC. */
export interface ServicoSenhas {
  gerarHash(senha: string): Promise<string>
  conferir(senha: string, armazenado: string): Promise<boolean>
  validarPolitica(senha: string): void
}

/** Visão síncrona da sessão, usada pela guarda de perfil no main. */
export interface ProvedorSessao {
  sessao(): Sessao | null
}

/** Mutadores de sessão necessários ao serviço de usuários. */
export interface GestorSessao extends ProvedorSessao {
  atualizarSessao(sessao: Sessao | null): void
}

export interface ServicoAutenticacao extends ProvedorSessao {
  entrar(dados: AutenticarEntrada): Promise<Sessao>
  sair(): Promise<void>
  sessaoAtual(): Promise<EstadoSessao>
  bootstrap(dados: BootstrapEntrada): Promise<Sessao>
  /** ADR 0009: auto-cadastro público; perfil fixo em `Cliente` no main. */
  cadastrarCliente(dados: CadastrarClienteEntrada): Promise<Sessao>
}

export interface ServicoUsuarios {
  listar(filtros?: UsuarioListarFiltros): Promise<readonly UsuarioPublico[]>
  criar(dados: UsuarioCriarEntrada): Promise<UsuarioPublico>
  atualizar(dados: UsuarioAtualizarEntrada): Promise<UsuarioPublico>
  alterarSenha(dados: UsuarioAlterarSenhaEntrada): Promise<void>
}

export interface ServicoFornecedores {
  listar(filtros?: FornecedorListarFiltros): Promise<readonly Fornecedor[]>
  buscarPorId(id: number): Promise<Fornecedor>
  criar(dados: FornecedorCriarEntrada): Promise<Fornecedor>
  atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor>
  inativar(id: number): Promise<void>
}

export interface ServicoClientes {
  /** `idClienteProprietario` é derivado da sessão no main (ADR 0009). */
  listar(filtros?: ClienteListarFiltros, idClienteProprietario?: number): Promise<readonly Cliente[]>
  buscarPorId(id: number, idClienteProprietario?: number): Promise<Cliente>
  buscarCep(cep: string): Promise<EnderecoCep>
  criar(dados: ClienteCriarEntrada): Promise<Cliente>
  atualizar(dados: ClienteAtualizarEntrada, idClienteProprietario?: number): Promise<Cliente>
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
  listar(filtros?: ReservaListarFiltros, idClienteProprietario?: number): Promise<readonly Reserva[]>
  buscarPorId(id: number, idClienteProprietario?: number): Promise<Reserva>
  /** O dono da sessão sobrepõe qualquer `clienteId` recebido do renderer. */
  criar(dados: ReservaCriarEntrada, idClienteProprietario?: number): Promise<Reserva>
  atualizar(dados: ReservaAtualizarEntrada, idClienteProprietario?: number): Promise<Reserva>
  inativar(id: number): Promise<void>
}

export interface ServicoItensReserva {
  listar(
    filtros?: ItemReservaListarFiltros,
    idClienteProprietario?: number,
  ): Promise<readonly ItemReserva[]>
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
  /** ADR 0008: consulta rica por data; opcional para colaboradores legados. */
  consultar?(data: string): Promise<RespostaPrevisaoTempo>
  /** `null` quando a integração está indisponível; opcional por compatibilidade. */
  altaDemanda?(data: string): Promise<boolean | null>
}

/** Integração de previsão por data — o mesmo objeto `ClimaServico` a implementa. */
export interface ServicoPrevisaoTempo {
  consultar(data: string): Promise<RespostaPrevisaoTempo>
}

export interface ServicoCnpj {
  consultar(cnpj: string): Promise<RespostaCnpj>
}

/** Método com nome próprio para não colidir com o `listar` dos repositórios. */
export interface ServicoFeriados {
  feriados(ano: number): Promise<RespostaFeriados>
}
