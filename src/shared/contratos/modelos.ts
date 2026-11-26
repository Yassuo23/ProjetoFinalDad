/** Tipos de domínio compartilhados. Só `type`/`interface`: somem no build. */

export interface AppInfo {
  name: string
  version: string
  electron: string
  node: string
  platform: string
  arch: string
}

export interface PingPayload {
  message: string
  timestamp: number
}

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
}

/** CRUD de categorias: `Categoria` permanece intacta para não quebrar quem já a consome. */
export type CategoriaDetalhe = Categoria & Auditado & Inativavel

export interface CategoriaCriarEntrada {
  readonly nome: string
  readonly descricao?: string | null
}

export interface CategoriaAtualizarEntrada extends IdEntrada {
  readonly nome?: string
  readonly descricao?: string | null
}

export interface CategoriaListarFiltros extends ListarFiltros {
  readonly nome?: string
}

/** Domínios fechados do banco — replicados nos schemas Zod do processo principal. */
export type CategoriaEquipamento = 'Bicicleta' | 'Caiaque' | 'Prancha' | 'Camping'
export type EstadoConservacao = 'Novo' | 'Bom' | 'Desgastado' | 'Em Manutenção'
export type DisponibilidadeEquipamento = 'Disponível' | 'Indisponível' | 'Em manutenção'
export type TipoFornecedor = 'Compra' | 'Manutenção' | 'Ambos'
export type StatusReserva = 'Pendente' | 'Confirmada' | 'Cancelada' | 'Concluída'
export type FormaPagamento = 'Pix' | 'Cartão de Crédito' | 'Dinheiro'
export type StatusPagamento = 'Pendente' | 'Pago' | 'Estornado'
export type EstadoPosUso = 'Perfeito' | 'Com avarias leves' | 'Danificado'
export type TipoPagamento = 'Reserva' | 'Multa'

/** Auditoria: toda tabela mutável tem `atualizado_em` gerenciada pelo MySQL. */
export interface Auditado {
  atualizadoEm: string
}

/** Soft delete: nenhuma tabela operacional sofre hard delete pela UI. */
export interface Inativavel {
  ativo: boolean
}

export interface Fornecedor extends Auditado, Inativavel {
  id: number
  nome: string
  cnpj: string
  telefone: string | null
  email: string | null
  tipo: TipoFornecedor | null
}

export interface Cliente extends Auditado, Inativavel {
  id: number
  nome: string
  cpf: string
  telefone: string | null
  email: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

export interface Equipamento extends Auditado, Inativavel {
  id: number
  nome: string
  categoria: CategoriaEquipamento
  estadoConservacao: EstadoConservacao
  disponibilidade: DisponibilidadeEquipamento
  fornecedorId: number | null
  /**
   * Diária de tabela (ADR 0007). Opcional apenas para preservar registros e
   * fixtures anteriores; o main devolve o valor, com `0` para legados.
   * A diária acordada na locação continua em `ItemReserva.valorDiaria`.
   */
  readonly valorDiaria?: number
}

export interface Reserva extends Auditado, Inativavel {
  id: number
  clienteId: number
  /** ISO 8601 com timezone (TIMESTAMP do banco). */
  dataReserva: string
  /** ISO `YYYY-MM-DD` (DATE do banco). */
  dataInicio: string
  dataFim: string
  statusReserva: StatusReserva
  previsaoTempo: string | null
  /**
   * ADR 0008: calculado no main ao confirmar. Opcional para não quebrar
   * registros, fixtures e chamadas atuais; `null` = integração indisponível.
   */
  readonly altaDemandaPrevista?: boolean | null
}

export interface ItemReserva {
  reservaId: number
  equipamentoId: number
  /** Histórico: valor acordado no momento da locação. */
  valorDiaria: number
}

export interface Pagamento extends Auditado, Inativavel {
  id: number
  reservaId: number
  valorBase: number
  valorMulta: number
  valorTotal: number
  formaPagamento: FormaPagamento | null
  statusPagamento: StatusPagamento
  /** ISO 8601 com timezone; `null` enquanto pendente. */
  dataPagamento: string | null
}

export interface Devolucao extends Auditado, Inativavel {
  id: number
  reservaId: number
  dataDevolucaoEfetiva: string
  estadoPosUso: EstadoPosUso
  observacoes: string | null
}

/** Endereço devolvido pela consulta automática de CEP (ViaCEP). */
export interface EnderecoCep {
  cep: string
  logradouro: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

export interface IdEntrada {
  readonly id: number
}

export interface ChaveItemReservaEntrada {
  readonly reservaId: number
  readonly equipamentoId: number
}

export interface ListarFiltros {
  /** Máximo de registros; o banco aplica `LIMIT`. */
  readonly limite?: number
  readonly deslocamento?: number
  /** Inclui inativos. Padrão: somente ativos. */
  readonly incluirInativos?: boolean
}

export interface FornecedorCriarEntrada {
  readonly nome: string
  readonly cnpj: string
  readonly telefone?: string | null
  readonly email?: string | null
  readonly tipo?: TipoFornecedor | null
}

export interface FornecedorAtualizarEntrada extends IdEntrada {
  readonly nome?: string
  readonly cnpj?: string
  readonly telefone?: string | null
  readonly email?: string | null
  readonly tipo?: TipoFornecedor | null
}

export interface FornecedorListarFiltros extends ListarFiltros {
  readonly nome?: string
  readonly tipo?: TipoFornecedor
}

export interface ClienteCriarEntrada {
  readonly nome: string
  readonly cpf: string
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

export interface ClienteAtualizarEntrada extends IdEntrada {
  readonly nome?: string
  readonly cpf?: string
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

export interface ClienteListarFiltros extends ListarFiltros {
  readonly nome?: string
  readonly cpf?: string
  readonly cidade?: string
}

export interface EquipamentoCriarEntrada {
  readonly nome: string
  readonly categoria: CategoriaEquipamento
  readonly estadoConservacao: EstadoConservacao
  /** Ausente = `Disponível` (default aplicado pelo schema do main). */
  readonly disponibilidade?: DisponibilidadeEquipamento
  readonly fornecedorId?: number | null
  /** Ausente = `0` no schema do main; nunca é inferida pela regra de locação. */
  readonly valorDiaria?: number
}

export interface EquipamentoAtualizarEntrada extends IdEntrada {
  readonly nome?: string
  readonly categoria?: CategoriaEquipamento
  readonly estadoConservacao?: EstadoConservacao
  readonly disponibilidade?: DisponibilidadeEquipamento
  readonly fornecedorId?: number | null
  readonly valorDiaria?: number
}

export interface EquipamentoListarFiltros extends ListarFiltros {
  readonly nome?: string
  readonly categoria?: CategoriaEquipamento
  readonly estadoConservacao?: EstadoConservacao
  readonly disponibilidade?: DisponibilidadeEquipamento
  readonly fornecedorId?: number
  readonly somenteDisponiveis?: boolean
}

export interface PeriodoEntrada {
  readonly dataInicio: string
  readonly dataFim: string
  /** Reserva a desconsiderar ao validar uma atualização. */
  readonly reservaId?: number
}

export interface ItemReservaEntrada {
  readonly equipamentoId: number
  readonly valorDiaria: number
}

export interface ReservaCriarEntrada {
  readonly clienteId: number
  readonly dataInicio: string
  readonly dataFim: string
  readonly itens: readonly ItemReservaEntrada[]
  readonly previsaoTempo?: string | null
}

export interface ReservaAtualizarEntrada extends IdEntrada {
  readonly clienteId?: number
  readonly dataInicio?: string
  readonly dataFim?: string
  readonly statusReserva?: StatusReserva
  readonly previsaoTempo?: string | null
  readonly itens?: readonly ItemReservaEntrada[]
}

export interface ReservaListarFiltros extends ListarFiltros {
  readonly clienteId?: number
  readonly statusReserva?: StatusReserva
  readonly dataInicio?: string
  readonly dataFim?: string
}

export interface ItemReservaCriarEntrada extends ItemReservaEntrada {
  readonly reservaId: number
}

export interface ItemReservaAtualizarEntrada extends ChaveItemReservaEntrada {
  readonly valorDiaria?: number
}

export interface ItemReservaListarFiltros extends ListarFiltros {
  readonly reservaId?: number
  readonly equipamentoId?: number
}

export interface PagamentoCriarEntrada {
  readonly reservaId: number
  readonly valorBase: number
  readonly valorMulta?: number
  readonly formaPagamento?: FormaPagamento | null
  readonly statusPagamento?: StatusPagamento
  readonly dataPagamento?: string | null
}

export interface PagamentoAtualizarEntrada extends IdEntrada {
  readonly reservaId?: number
  readonly valorBase?: number
  readonly valorMulta?: number
  readonly formaPagamento?: FormaPagamento | null
  readonly statusPagamento?: StatusPagamento
  readonly dataPagamento?: string | null
}

export interface PagamentoListarFiltros extends ListarFiltros {
  readonly reservaId?: number
  readonly statusPagamento?: StatusPagamento
  readonly formaPagamento?: FormaPagamento
  /** ISO `YYYY-MM-DD`; filtra por `dataPagamento` no main. */
  readonly dataInicio?: string
  readonly dataFim?: string
  /** `Multa` = pagamento com `valorMulta > 0`; derivado no main. */
  readonly tipo?: TipoPagamento
}

export interface DevolucaoCriarEntrada {
  readonly reservaId: number
  /** Ausente = `CURRENT_TIMESTAMP` do banco. */
  readonly dataDevolucaoEfetiva?: string
  readonly estadoPosUso: EstadoPosUso
  readonly observacoes?: string | null
}

export interface DevolucaoAtualizarEntrada extends IdEntrada {
  readonly dataDevolucaoEfetiva?: string
  readonly estadoPosUso?: EstadoPosUso
  readonly observacoes?: string | null
}

export interface DevolucaoListarFiltros extends ListarFiltros {
  readonly reservaId?: number
  readonly estadoPosUso?: EstadoPosUso
}

// ---------------------------------------------------------------------------
// Autenticação e usuários (ADR 0007)
// ---------------------------------------------------------------------------

/** ADR 0009: `Cliente` é a terceira identidade da mesma tabela `usuario`. */
export type PerfilUsuario = 'Administrador' | 'Atendente' | 'Cliente'

/** Modelo interno do main: `senhaHash` NUNCA atravessa o IPC. */
export interface Usuario extends Auditado, Inativavel {
  id: number
  nome: string
  login: string
  senhaHash: string
  perfil: PerfilUsuario
}

/** Forma pública devolvida ao renderer: sem hash, sem senha. */
export type UsuarioPublico = Omit<Usuario, 'senhaHash'>

export interface Sessao {
  readonly usuarioId: number
  readonly nome: string
  readonly login: string
  readonly perfil: PerfilUsuario
  /**
   * ADR 0009: `null` para Administrador/Atendente; id da linha em `cliente`
   * para Cliente. O main sempre preenche; opcional apenas para compatibilidade
   * com fixtures antigas do renderer, que não podem ser alteradas nesta entrega.
   * Ausência é tratada como "sem vínculo" (fail-closed) na autorização.
   */
  readonly clienteId?: number | null
}

/** `bootstrap` só aparece quando não existe nenhum usuário cadastrado. */
export type EstadoSessao =
  | { readonly estado: 'autenticada'; readonly sessao: Sessao }
  | { readonly estado: 'anonima' }
  | { readonly estado: 'bootstrap' }

export interface AutenticarEntrada {
  readonly login: string
  readonly senha: string
}

export interface BootstrapEntrada {
  readonly nome: string
  readonly login: string
  /** Senha escolhida pelo usuário no primeiro lançamento; nunca hardcoded. */
  readonly senha: string
}

/**
 * ADR 0009: auto-cadastro público. Não existe campo `perfil`: o main fixa
 * `'Cliente'` por literal e rejeita qualquer tentativa de auto-elevação.
 */
export interface CadastrarClienteEntrada {
  readonly nome: string
  readonly cpf: string
  readonly login: string
  readonly senha: string
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

export interface UsuarioListarFiltros extends ListarFiltros {
  readonly nome?: string
  readonly login?: string
  readonly perfil?: PerfilUsuario
}

export interface UsuarioCriarEntrada {
  readonly nome: string
  readonly login: string
  readonly senha: string
  readonly perfil: PerfilUsuario
}

export interface UsuarioAtualizarEntrada extends IdEntrada {
  readonly nome?: string
  readonly login?: string
  readonly perfil?: PerfilUsuario
  readonly ativo?: boolean
}

export interface UsuarioAlterarSenhaEntrada extends IdEntrada {
  readonly senhaNova: string
  /** Obrigatória quando o administrador altera a própria senha. */
  readonly senhaAtual?: string
}

// ---------------------------------------------------------------------------
// Manutenção (ADR 0007)
// ---------------------------------------------------------------------------

export type StatusOrdemManutencao = 'Aberta' | 'Em andamento' | 'Concluída'

export interface OrdemManutencao extends Auditado, Inativavel {
  id: number
  equipamentoId: number
  fornecedorId: number | null
  descricao: string
  /** ISO `YYYY-MM-DD` (DATE do banco). */
  dataEnvio: string
  dataRetornoPrevista: string | null
  /** ISO `YYYY-MM-DD`; preenchida ao concluir. */
  dataRetorno: string | null
  custo: number | null
  status: StatusOrdemManutencao
}

export interface OrdemManutencaoCriarEntrada {
  readonly equipamentoId: number
  readonly fornecedorId?: number | null
  readonly descricao: string
  readonly dataEnvio: string
  readonly dataRetornoPrevista?: string | null
  readonly custo?: number | null
  /** Ausente = `Aberta` (default aplicado pelo schema do main). */
  readonly status?: StatusOrdemManutencao
}

export interface OrdemManutencaoAtualizarEntrada extends IdEntrada {
  readonly equipamentoId?: number
  readonly fornecedorId?: number | null
  readonly descricao?: string
  readonly dataEnvio?: string
  readonly dataRetornoPrevista?: string | null
  readonly dataRetorno?: string | null
  readonly custo?: number | null
  readonly status?: StatusOrdemManutencao
}

export interface OrdemManutencaoConcluirEntrada extends IdEntrada {
  /** Ausente = data local atual resolvida pelo main. */
  readonly dataRetorno?: string
  readonly custo?: number | null
}

export interface OrdemManutencaoListarFiltros extends ListarFiltros {
  readonly equipamentoId?: number
  readonly fornecedorId?: number
  readonly status?: StatusOrdemManutencao
  readonly dataEnvio?: string
  readonly dataRetornoPrevista?: string
}

// ---------------------------------------------------------------------------
// Integrações (ADR 0007) — indisponibilidade é RETORNO, não exceção
// ---------------------------------------------------------------------------

export type MotivoIndisponibilidade =
  | 'SERVICO_FORA'
  | 'CREDENCIAL_AUSENTE'
  | 'SEM_DADOS'
  | 'PESQUISA_INVALIDA'

export type CondicaoTempo = 'Ensolarado' | 'Nublado' | 'Chuvoso' | 'Outro'

export interface PrevisaoTempoEntrada {
  /** ISO `YYYY-MM-DD` — a data da reserva, nunca uma cidade. */
  readonly data: string
}

export interface PrevisaoTempoDisponivel {
  readonly estado: 'disponivel'
  readonly data: string
  readonly condicao: CondicaoTempo | null
  readonly descricao: string | null
  readonly temperaturaMinC: number | null
  readonly temperaturaMaxC: number | null
  readonly ventoKmH: number | null
}

export interface PrevisaoTempoIndisponivel {
  readonly estado: 'indisponivel'
  readonly data: string
  readonly motivo: MotivoIndisponibilidade
}

export type RespostaPrevisaoTempo = PrevisaoTempoDisponivel | PrevisaoTempoIndisponivel

export interface DadosCnpj {
  readonly cnpj: string
  readonly razaoSocial: string
  readonly nomeFantasia: string | null
  readonly situacao: string | null
  readonly atividadePrincipal: string | null
  /** ADR 0008: opcionais/aditivos para preenchimento de endereço do fornecedor. */
  readonly logradouro?: string | null
  readonly numero?: string | null
  readonly complemento?: string | null
  readonly bairro?: string | null
  readonly cidade?: string | null
  readonly uf?: string | null
  readonly cep?: string | null
}

export type RespostaCnpj =
  | { readonly estado: 'disponivel'; readonly dados: DadosCnpj }
  | {
      readonly estado: 'indisponivel'
      readonly cnpj: string
      readonly motivo: MotivoIndisponibilidade
    }

export interface FeriadoNacional {
  /** ISO `YYYY-MM-DD`. */
  readonly data: string
  readonly nome: string
}

export interface FeriadosEntrada {
  readonly ano: number
}

export type RespostaFeriados =
  | {
      readonly estado: 'disponivel'
      readonly ano: number
      readonly feriados: readonly FeriadoNacional[]
    }
  | {
      readonly estado: 'indisponivel'
      readonly ano: number
      readonly motivo: MotivoIndisponibilidade
      readonly feriados: readonly []
    }

export interface IntegracaoIndisponivel {
  readonly integracao: 'previsao-tempo' | 'cnpj' | 'feriados'
  readonly motivo: MotivoIndisponibilidade
}

// ---------------------------------------------------------------------------
// Dashboard, devoluções pendentes e multa (ADR 0007)
// ---------------------------------------------------------------------------

export type StatusDevolucaoPendente = 'No prazo' | 'Atrasada'

export interface DevolucaoPendente {
  readonly reservaId: number
  readonly clienteId: number
  readonly clienteNome: string
  readonly equipamentoId: number | null
  readonly equipamentoNome: string | null
  /** ISO `YYYY-MM-DD`. */
  readonly dataPrevista: string
  readonly status: StatusDevolucaoPendente
  readonly atrasada: boolean
  readonly diasAtraso: number
  /** Prévia; a multa definitiva vem de `devolucoes:calcular-multa`. */
  readonly valorMultaEstimado: number
}

export interface DevolucoesPendentesEntrada {
  /** ISO `YYYY-MM-DD`; padrão = hoje no main. */
  readonly data?: string
}

export interface CalculoMultaEntrada {
  readonly reservaId: number
  /** ISO `YYYY-MM-DD`. */
  readonly dataDevolucao: string
}

export interface CalculoMulta {
  readonly reservaId: number
  readonly dataPrevista: string
  readonly dataDevolucao: string
  readonly diasAtraso: number
  /** Valor configurado no main (`MULTA_DIARIA_VALOR`); não via IPC. */
  readonly valorDiarioMulta: number
  readonly valorMulta: number
}

export interface ContadoresDashboard {
  readonly reservasHoje: number
  readonly devolucoesPendentes: number
  readonly devolucoesAtrasadas: number
  readonly equipamentosEmManutencao: number
}

export interface FaturamentoDashboard {
  readonly valor: number
  /** Sempre `false` em dados reais; campo preservado para o renderer legado. */
  readonly estimado: boolean
}

export interface FinanceiroDashboard {
  readonly aPagar: number
  readonly recebido: number
  readonly multas: number
}

export interface ResumoDashboard {
  /** ISO `YYYY-MM-DD` efetivamente usado na agregação. */
  readonly data: string
  readonly contadores: ContadoresDashboard
  readonly faturamento: FaturamentoDashboard
  readonly devolucoesPendentes: readonly DevolucaoPendente[]
  /** `null` para atendente: finanças são exclusivas do administrador. */
  readonly financeiro: FinanceiroDashboard | null
  readonly integracoesIndisponiveis: readonly IntegracaoIndisponivel[]
}

export interface ResumoDashboardEntrada {
  /** ISO `YYYY-MM-DD`; padrão = hoje no main. */
  readonly data?: string
}

/** Códigos estáveis que atravessam o IPC; nunca mensagens de driver/SQL. */
export type CodigoErroDominio =
  | 'NAO_ENCONTRADO'
  | 'REGISTRO_DUPLICADO'
  | 'RELACAO_INVALIDA'
  | 'PERIODO_INVALIDO'
  | 'EQUIPAMENTO_INDISPONIVEL'
  | 'CEP_INVALIDO'
  | 'CLIMA_INDISPONIVEL'
  | 'URL_NAO_PERMITIDA'
  | 'DADOS_INVALIDOS'
  | 'CREDENCIAIS_INVALIDAS'
  | 'USUARIO_INATIVO'
  | 'SEM_PERMISSAO'
  | 'NAO_AUTENTICADO'
  | 'SENHA_FRACA'
  | 'BOOTSTRAP_JA_REALIZADO'
  | 'LOGIN_DUPLICADO'
  | 'PERFIL_INVALIDO'
  | 'CPF_DUPLICADO'
  | 'BOOTSTRAP_PENDENTE'

export interface ErroDominio {
  readonly codigo: CodigoErroDominio
  readonly mensagem: string
}
