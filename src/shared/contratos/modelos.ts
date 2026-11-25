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

/** Domínios fechados do banco — replicados nos schemas Zod do processo principal. */
export type CategoriaEquipamento = 'Bicicleta' | 'Caiaque' | 'Prancha' | 'Camping'
export type EstadoConservacao = 'Novo' | 'Bom' | 'Desgastado' | 'Em Manutenção'
export type DisponibilidadeEquipamento = 'Disponível' | 'Indisponível' | 'Em manutenção'
export type TipoFornecedor = 'Compra' | 'Manutenção' | 'Ambos'
export type StatusReserva = 'Pendente' | 'Confirmada' | 'Cancelada' | 'Concluída'
export type FormaPagamento = 'Pix' | 'Cartão de Crédito' | 'Dinheiro'
export type StatusPagamento = 'Pendente' | 'Pago' | 'Estornado'
export type EstadoPosUso = 'Perfeito' | 'Com avarias leves' | 'Danificado'

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
}

export interface EquipamentoAtualizarEntrada extends IdEntrada {
  readonly nome?: string
  readonly categoria?: CategoriaEquipamento
  readonly estadoConservacao?: EstadoConservacao
  readonly disponibilidade?: DisponibilidadeEquipamento
  readonly fornecedorId?: number | null
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

export interface ErroDominio {
  readonly codigo: CodigoErroDominio
  readonly mensagem: string
}
