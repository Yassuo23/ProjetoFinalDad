/** Tipos de domínio compartilhados. Só `type`/`interface`: somem no build. */
import type { Canal } from './canais'

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
}

/** Estado físico do equipamento — enum fechado, usado em filtros e manutenção. */
export type EstadoEquipamento = 'otimo' | 'bom' | 'regular' | 'em_manutencao' | 'baixado'

export interface Equipamento {
  id: number
  nome: string
  categoriaId: number
  precoDiaria: number
  disponivel: boolean
  /** Opcional enquanto o renderer legado não é atualizado pelo FE. */
  readonly estado?: EstadoEquipamento
}

export type StatusReserva = 'pendente' | 'confirmada' | 'cancelada' | 'concluida'

export interface Reserva {
  id: number
  clienteId: number
  equipamentoId: number
  inicio: string
  fim: string
  status: StatusReserva
}

// ---------------------------------------------------------------------------
// Novas entidades do domínio
// ---------------------------------------------------------------------------

export interface Fornecedor {
  id: number
  razaoSocial: string
  cnpj: string | null
  contato: string | null
  telefone: string | null
}

export interface Devolucao {
  id: number
  reservaId: number
  devolvidaEm: string
  estadoRecebido: EstadoEquipamento
  valorMulta: number
  observacoes: string | null
}

export interface Pagamento {
  id: number
  reservaId: number
  valor: number
  pagoEm: string
  forma: 'dinheiro' | 'pix' | 'cartao' | 'boleto'
  observacoes: string | null
}

export interface Manutencao {
  id: number
  equipamentoId: number
  fornecedorId: number | null
  descricao: string
  abertaEm: string
  concluidaEm: string | null
}

/** Perfis de acesso — regra mora no serviço de usuários; aqui é só o vocabulário. */
export type PerfilUsuario = 'administrador' | 'atendente' | 'visualizador'

export interface Usuario {
  id: number
  nome: string
  login: string
  perfil: PerfilUsuario
  ativo: boolean
}

// ---------------------------------------------------------------------------
// DTOs de integração (respostas normalizadas, nunca o JSON bruto do provedor)
// ---------------------------------------------------------------------------

export interface EnderecoViaCep {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export interface PrevisaoClima {
  data: string
  local: string
  temperaturaMin: number
  temperaturaMax: number
  descricao: string
  probabilidadeChuva: number
}

export interface DadosCnpj {
  cnpj: string
  razaoSocial: string
  situacao: string
}

export interface Feriado {
  data: string
  nome: string
}

// ---------------------------------------------------------------------------
// Erros de domínio tipados — o renderer recebe só o código + mensagem pública.
// ---------------------------------------------------------------------------

export type CodigoErroDominio =
  | 'VALIDACAO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'REGRA_NEGOCIO'
  | 'INTEGRACAO_INDISPONIVEL'
  | 'SEM_PERMISSAO'
  | 'INTERNO'

/** Formato único de erro que atravessa a ponte. Sem stack, SQL ou segredo. */
export interface ErroApi {
  readonly codigo: CodigoErroDominio
  readonly mensagem: string
  readonly canal: Canal
}

// ---------------------------------------------------------------------------
// Payloads de comando (CRUD e ações de domínio)
// ---------------------------------------------------------------------------

export interface IdPayload {
  readonly id: number
}

export interface CriarCategoriaPayload {
  readonly nome: string
  readonly descricao: string | null
}

export interface AtualizarCategoriaPayload extends IdPayload, CriarCategoriaPayload {}

export interface CriarEquipamentoPayload {
  readonly nome: string
  readonly categoriaId: number
  readonly precoDiaria: number
  readonly estado: EstadoEquipamento
}

export interface AtualizarEquipamentoPayload extends IdPayload, CriarEquipamentoPayload {}

export interface PeriodoPayload {
  readonly inicio: string
  readonly fim: string
}

export interface EquipamentosDisponiveisPayload extends PeriodoPayload {
  readonly categoriaId: number | null
}

export interface CriarClientePayload {
  readonly nome: string
  readonly email: string | null
  readonly telefone: string | null
}

export interface AtualizarClientePayload extends IdPayload, CriarClientePayload {}

export interface CriarFornecedorPayload {
  readonly razaoSocial: string
  readonly cnpj: string | null
  readonly contato: string | null
  readonly telefone: string | null
}

export interface AtualizarFornecedorPayload extends IdPayload, CriarFornecedorPayload {}

export interface CriarReservaPayload {
  readonly clienteId: number
  readonly equipamentoId: number
  readonly inicio: string
  readonly fim: string
}

export interface AtualizarReservaPayload extends IdPayload, CriarReservaPayload {}

export interface RegistrarDevolucaoPayload {
  readonly reservaId: number
  readonly devolvidaEm: string
  readonly estadoRecebido: EstadoEquipamento
  readonly observacoes: string | null
}

export interface CalcularMultaPayload {
  readonly reservaId: number
  readonly devolvidaEm: string
}

export interface ValorMulta {
  readonly valor: number
  readonly diasAtraso: number
}

export interface RegistrarPagamentoPayload {
  readonly reservaId: number
  readonly valor: number
  readonly pagoEm: string
  readonly forma: Pagamento['forma']
  readonly observacoes: string | null
}

export interface AbrirManutencaoPayload {
  readonly equipamentoId: number
  readonly fornecedorId: number | null
  readonly descricao: string
}

export interface ConcluirManutencaoPayload extends IdPayload {
  readonly concluidaEm: string
}

export interface CriarUsuarioPayload {
  readonly nome: string
  readonly login: string
  readonly perfil: PerfilUsuario
}

export interface AtualizarUsuarioPayload extends IdPayload {
  readonly nome: string
  readonly perfil: PerfilUsuario
  readonly ativo: boolean
}

export interface AutenticarPayload {
  readonly login: string
  readonly senha: string
}

export interface CepBuscarPayload {
  readonly cep: string
}

export interface ClimaPrevisaoPayload {
  readonly data: string
  readonly local: string
}

export interface CnpjBuscarPayload {
  readonly cnpj: string
}

export interface FeriadosListarPayload {
  readonly ano: number
  readonly uf: string
}

// ---------------------------------------------------------------------------
// Recursos nativos — payloads e retornos da ponte (somente tipos)
// ---------------------------------------------------------------------------

/** Extensões dos diálogos, sempre com ponto inicial (ex.: `.csv`). */
export interface AbrirArquivoPayload {
  readonly titulo: string
  readonly extensoes: readonly string[]
}

export interface ArquivoSelecionado {
  readonly caminho: string
  readonly nome: string
}

export interface SalvarArquivoPayload {
  readonly titulo: string
  readonly nomePadrao: string
  readonly extensoes: readonly string[]
}

/** O main grava a cópia em `destino`; o renderer já escolheu o caminho. */
export interface BackupBancoPayload {
  readonly destino: string
}

export interface ResultadoBackup {
  readonly caminho: string
  readonly bytes: number
}

/** Restauração é destrutiva: o main valida a origem e protege o banco atual. */
export interface RestaurarBancoPayload {
  readonly origem: string
}

export interface ResultadoRestauracao {
  readonly caminho: string
  readonly bytes: number
}

export type CelulaCsv = string | number | null

/** `linhas` não inclui cabeçalho; ele vem de `colunas`. */
export interface ExportarCsvPayload {
  readonly nomeArquivo: string
  readonly colunas: readonly string[]
  readonly linhas: readonly (readonly CelulaCsv[])[]
}

/** A regra que identifica atrasos mora no serviço de devoluções; aqui vai só o aviso. */
export interface NotificacaoDevolucaoAtrasoPayload {
  readonly quantidade: number
  readonly detalhes: string | null
}

export interface SafeStorageCifrarPayload {
  readonly texto: string
}

export interface SafeStorageDecifrarPayload {
  /** Texto cifrado em base64, como devolvido por `safeStorage`. */
  readonly textoCifrado: string
}
