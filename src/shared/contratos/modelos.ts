/** Tipos de domínio compartilhados. Só `type`/`interface`: somem no build. */

import type { EstadoEquipamento } from './estados'

export type { EstadoEquipamento } from './estados'

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

export interface Cliente {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  /** Inativação lógica: cliente com reserva nunca é apagado. */
  ativo: boolean
}

export interface ClientesListarFiltros {
  nome?: string
  ativo?: boolean
}

/** Endereço devolvido pela consulta de CEP; preenchido pelo main, não pelo renderer. */
export interface Endereco {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export interface ConsultarCepEntrada {
  cep: string
}

export interface ClienteCriarEntrada {
  nome: string
  email?: string | null
  telefone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}

export interface ClienteAtualizarEntrada {
  id: number
  nome?: string
  email?: string | null
  telefone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}

export interface Equipamento {
  id: number
  nome: string
  categoriaId: number
  precoDiaria: number
  /** Base configurável do cálculo de multa de atraso (P6). */
  valorAquisicao: number
  estado: EstadoEquipamento
  /** Inativação lógica: nunca apague equipamento com histórico de reserva. */
  ativo: boolean
  descricao: string | null
}

export interface EquipamentoListarFiltros {
  categoriaId?: number
  estado?: EstadoEquipamento
}

export interface EquipamentoIdEntrada {
  id: number
}

export interface EquipamentoCriarEntrada {
  nome: string
  categoriaId: number
  precoDiaria: number
  valorAquisicao: number
  descricao?: string | null
}

export interface EquipamentoAtualizarEntrada extends EquipamentoIdEntrada {
  nome?: string
  categoriaId?: number
  precoDiaria?: number
  valorAquisicao?: number
  estado?: EstadoEquipamento
  descricao?: string | null
}

export interface EquipamentoDisponiveisEntrada {
  inicio: string
  fim: string
  categoriaId?: number
}

/** P4 — verificação pontual para um equipamento e período. */
export interface VerificarDisponibilidadeEntrada {
  equipamentoId: number
  inicio: string
  fim: string
}

export interface DisponibilidadeResultado {
  disponivel: boolean
  /** Presente quando `disponivel` é false; o renderer traduz o código. */
  motivo?: CodigoErroDominio
}

export type StatusReserva = 'pendente' | 'confirmada' | 'cancelada' | 'concluida'

export interface Reserva {
  id: number
  clienteId: number
  equipamentoId: number
  inicio: string
  fim: string
  status: StatusReserva
  /** Local da atividade — base da previsão do tempo (P5). */
  localAtividade: string | null
  criadoEm: string
}

export interface ReservasListarFiltros {
  clienteId?: number
  equipamentoId?: number
  status?: StatusReserva
}

export interface ReservaCriarEntrada {
  clienteId: number
  equipamentoId: number
  inicio: string
  fim: string
  localAtividade: string
}

export interface PrevisaoTempoEntrada {
  local: string
  inicio: string
  fim: string
}

export interface PrevisaoDia {
  data: string
  temperaturaMin: number
  temperaturaMax: number
  precipitacaoMm: number
  descricao: string
}

export interface PrevisaoTempo {
  local: string
  latitude: number
  longitude: number
  dias: PrevisaoDia[]
}

/** P6 — devolução e cálculo de multa por atraso. */
export interface Devolucao {
  id: number
  reservaId: number
  devolvidoEm: string
  observacoes: string | null
  diasAtraso: number
  valorDiaria: number
  valorMulta: number
}

export interface DevolucaoRegistrarEntrada {
  reservaId: number
  devolvidoEm: string
  observacoes?: string | null
}

export interface MultaCalcularEntrada {
  reservaId: number
  devolvidoEm: string
}

export interface CalculoMulta {
  diasAtraso: number
  diasCarencia: number
  valorDiaria: number
  valorLocacao: number
  baseCalculo: number
  percentualDiario: number
  valorMultaBruta: number
  valorMulta: number
  valorTotal: number
  tetoAplicado: boolean
}

/** P7 — pagamento único por reserva, com status próprio. */
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito'
export type StatusPagamento = 'pendente' | 'pago' | 'estornado'

export interface Pagamento {
  id: number
  reservaId: number
  valor: number
  forma: FormaPagamento
  status: StatusPagamento
  pagoEm: string | null
  criadoEm: string
}

export interface PagamentoRegistrarEntrada {
  reservaId: number
  valor: number
  forma: FormaPagamento
}

export interface PagamentosListarFiltros {
  reservaId?: number
  status?: StatusPagamento
}

/**
 * Códigos de erro de domínio. O IPC rejeita com `Error.message === codigo`;
 * o renderer traduz o código para texto amigável, sem detalhe de driver/Zod.
 */
/** P3 — Fornecedores e consulta de CNPJ. */
export interface Fornecedor {
  id: number
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string
  email: string | null
  telefone: string | null
  cep: string | null
  cidade: string | null
  uf: string | null
  ativo: boolean
}

export interface DadosCnpj {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  cidade: string | null
  uf: string | null
}

export interface ConsultarCnpjEntrada {
  cnpj: string
}

export interface FornecedoresListarFiltros {
  razaoSocial?: string
  ativo?: boolean
}

export interface FornecedorCriarEntrada {
  razaoSocial: string
  nomeFantasia?: string | null
  cnpj: string
  email?: string | null
  telefone?: string | null
  cep?: string | null
  cidade?: string | null
  uf?: string | null
}

export interface FornecedorAtualizarEntrada {
  id: number
  razaoSocial?: string
  nomeFantasia?: string | null
  cnpj?: string
  email?: string | null
  telefone?: string | null
  cep?: string | null
  cidade?: string | null
  uf?: string | null
}

/** P8 — Manutenção muda o estado do equipamento na conclusão. */
export type StatusManutencao = 'aberta' | 'concluida'

export interface Manutencao {
  id: number
  equipamentoId: number
  descricao: string
  status: StatusManutencao
  abertaEm: string
  concluidaEm: string | null
  custo: number | null
}

export interface ManutencaoAbrirEntrada {
  equipamentoId: number
  descricao: string
  custo?: number | null
}

export interface ManutencaoConcluirEntrada {
  id: number
  custo?: number | null
}

export interface ManutencoesListarFiltros {
  equipamentoId?: number
  status?: StatusManutencao
}

/** P9 — Catálogo de feriados; `uf = ''` representa âmbito nacional. */
export type TipoFeriado = 'nacional' | 'estadual' | 'municipal' | 'personalizado'

export interface Feriado {
  id: number
  data: string
  nome: string
  tipo: TipoFeriado
  uf: string
}

export interface FeriadoCriarEntrada {
  data: string
  nome: string
  tipo: TipoFeriado
  uf?: string
}

export interface FeriadoAtualizarEntrada {
  id: number
  data?: string
  nome?: string
  tipo?: TipoFeriado
  uf?: string
}

export interface FeriadoImportarEntrada {
  ano: number
  uf?: string
}

export interface FeriadosListarFiltros {
  ano?: number
  uf?: string
  tipo?: TipoFeriado
}

/** P10 — Perfis locais; a senha nunca sai do main. */
export type Perfil = 'administrador' | 'operador' | 'visualizador'

export interface Usuario {
  id: number
  nome: string
  login: string
  perfil: Perfil
  ativo: boolean
  criadoEm: string
}

export interface UsuarioCriarEntrada {
  nome: string
  login: string
  senha: string
  perfil: Perfil
}

export interface UsuarioAtualizarEntrada {
  id: number
  nome?: string
  login?: string
  perfil?: Perfil
  ativo?: boolean
}

export interface UsuarioAutenticarEntrada {
  login: string
  senha: string
}

export interface UsuariosListarFiltros {
  perfil?: Perfil
  ativo?: boolean
}

/** P11 — Agregados de leitura; nenhum dado novo é persistido. */
export interface PainelFiltros {
  ano?: number
}

export interface ResumoPainel {
  equipamentosAtivos: number
  equipamentosDisponiveis: number
  equipamentosEmManutencao: number
  reservasPendentes: number
  reservasConfirmadas: number
  reservasConcluidas: number
  clientesAtivos: number
  valorLocacao: number
  valorMultas: number
  valorRecebido: number
}

export interface ItemPorCategoria {
  categoriaId: number
  nome: string
  equipamentos: number
  reservas: number
}

export interface ItemReceita {
  mes: string
  locacao: number
  multas: number
  recebido: number
}

export type CodigoErroDominio =
  | 'EQUIPAMENTO_NAO_ENCONTRADO'
  | 'EQUIPAMENTO_INATIVO'
  | 'CATEGORIA_NAO_ENCONTRADA'
  | 'NOME_DUPLICADO'
  | 'PERIODO_INVALIDO'
  | 'ITEM_INDISPONIVEL'
  | 'RESERVA_JA_CANCELADA'
  | 'URL_NAO_PERMITIDA'
  | 'CLIENTE_NAO_ENCONTRADO'
  | 'EMAIL_DUPLICADO'
  | 'CEP_INVALIDO'
  | 'CEP_NAO_ENCONTRADO'
  | 'RESERVA_NAO_ENCONTRADA'
  | 'RESERVA_JA_CONFIRMADA'
  | 'LOCAL_NAO_ENCONTRADO'
  | 'PREVISAO_INDISPONIVEL'
  | 'DEVOLUCAO_JA_REGISTRADA'
  | 'DEVOLUCAO_DATA_INVALIDA'
  | 'RESERVA_NAO_CONFIRMADA'
  | 'MULTA_BASE_INDISPONIVEL'
  | 'PAGAMENTO_NAO_ENCONTRADO'
  | 'PAGAMENTO_JA_REGISTRADO'
  | 'PAGAMENTO_JA_PAGO'
  | 'PAGAMENTO_JA_ESTORNADO'
  | 'VALOR_PAGAMENTO_INVALIDO'
  | 'FORNECEDOR_NAO_ENCONTRADO'
  | 'CNPJ_INVALIDO'
  | 'CNPJ_NAO_ENCONTRADO'
  | 'CNPJ_DUPLICADO'
  | 'MANUTENCAO_NAO_ENCONTRADA'
  | 'MANUTENCAO_JA_ABERTA'
  | 'MANUTENCAO_JA_CONCLUIDA'
  | 'FERIADO_NAO_ENCONTRADO'
  | 'FERIADO_JA_EXISTENTE'
  | 'FERIADOS_INDISPONIVEIS'
  | 'USUARIO_NAO_ENCONTRADO'
  | 'LOGIN_DUPLICADO'
  | 'SENHA_INVALIDA'
  | 'USUARIO_INATIVO'

export interface ErroDominio {
  readonly codigo: CodigoErroDominio
  readonly mensagem: string
}
