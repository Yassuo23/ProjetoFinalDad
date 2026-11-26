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
  CategoriaAtualizarEntrada,
  CategoriaCriarEntrada,
  CategoriaDetalhe,
  CategoriaListarFiltros,
  PerfilUsuario,
  Usuario,
  UsuarioAtualizarEntrada,
  UsuarioListarFiltros,
} from '../../shared/contratos/modelos'

/** Efeitos calculados pelo serviço e aplicados atomicamente pelo repositório. */
export interface EfeitosDevolucao {
  readonly valorMulta: number
  readonly manutencao: boolean
}

export interface DadosCriacaoUsuario {
  readonly nome: string
  readonly login: string
  readonly senhaHash: string
  readonly perfil: PerfilUsuario
}

/** Dados já normalizados pelo serviço de autenticação (senha só como hash). */
export interface DadosCadastroCliente {
  readonly nome: string
  readonly cpf: string
  readonly login: string
  readonly senhaHash: string
  readonly telefone?: string | null
  readonly email?: string | null
  readonly cep?: string | null
  readonly logradouro?: string | null
  readonly numero?: string | null
  readonly complemento?: string | null
  readonly bairro?: string | null
  readonly cidade?: string | null
  readonly uf?: string | null
}

export interface UsuarioEClienteCriados {
  readonly usuario: Usuario
  readonly cliente: Cliente
}

/**
 * Identidade única `usuario → cliente` (ADR 0009). `criar` roda em uma única
 * transação: ou os dois registros entram juntos, ou nenhum entra.
 */
export interface RepositorioCadastroCliente {
  contarAdministradoresAtivos(): Promise<number>
  cpfEmUso(cpf: string): Promise<boolean>
  clienteIdPorUsuario(usuarioId: number): Promise<number | null>
  criar(dados: DadosCadastroCliente): Promise<UsuarioEClienteCriados>
}

export interface RepositorioCategorias {
  listar(filtros?: CategoriaListarFiltros): Promise<readonly Categoria[]>
  buscarPorId(id: number): Promise<CategoriaDetalhe | null>
  criar(dados: CategoriaCriarEntrada): Promise<CategoriaDetalhe>
  atualizar(dados: CategoriaAtualizarEntrada): Promise<CategoriaDetalhe | null>
  inativar(id: number): Promise<boolean>
  nomeEmUso(nome: string, idExcluido?: number): Promise<boolean>
  /** `equipamento.categoria` guarda o nome da categoria (migração 002). */
  emUsoPorEquipamento(nome: string): Promise<boolean>
}

export interface RepositorioUsuarios {
  contar(): Promise<number>
  listar(filtros?: UsuarioListarFiltros): Promise<readonly Usuario[]>
  buscarPorId(id: number): Promise<Usuario | null>
  buscarPorLogin(login: string): Promise<Usuario | null>
  loginEmUso(login: string, idExcluido?: number): Promise<boolean>
  criar(dados: DadosCriacaoUsuario): Promise<Usuario>
  atualizar(dados: UsuarioAtualizarEntrada): Promise<Usuario | null>
  atualizarSenha(id: number, senhaHash: string): Promise<boolean>
}

export interface RepositorioFornecedores {
  listar(filtros?: FornecedorListarFiltros): Promise<readonly Fornecedor[]>
  buscarPorId(id: number): Promise<Fornecedor | null>
  criar(dados: FornecedorCriarEntrada): Promise<Fornecedor>
  atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor | null>
  inativar(id: number): Promise<boolean>
  cnpjEmUso(cnpj: string, idExcluido?: number): Promise<boolean>
}

/**
 * `idClienteProprietario`, quando informado, é acrescentado como `WHERE` no
 * SQL pelo main. Nunca vem do renderer: é derivado da sessão (ADR 0009).
 */
export interface RepositorioClientes {
  listar(filtros?: ClienteListarFiltros, idClienteProprietario?: number): Promise<readonly Cliente[]>
  buscarPorId(id: number, idClienteProprietario?: number): Promise<Cliente | null>
  criar(dados: ClienteCriarEntrada): Promise<Cliente>
  atualizar(dados: ClienteAtualizarEntrada, idClienteProprietario?: number): Promise<Cliente | null>
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
  listar(filtros?: ReservaListarFiltros, idClienteProprietario?: number): Promise<readonly Reserva[]>
  buscarPorId(id: number, idClienteProprietario?: number): Promise<Reserva | null>
  /** O dono da sessão sobrepõe qualquer `clienteId` recebido do renderer. */
  criar(dados: ReservaCriarEntrada, idClienteProprietario?: number): Promise<Reserva>
  atualizar(dados: ReservaAtualizarEntrada, idClienteProprietario?: number): Promise<Reserva | null>
  inativar(id: number): Promise<boolean>
}

export interface RepositorioItensReserva {
  listar(
    filtros?: ItemReservaListarFiltros,
    idClienteProprietario?: number,
  ): Promise<readonly ItemReserva[]>
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
