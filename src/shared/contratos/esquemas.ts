import { z } from 'zod'

/**
 * Schemas de validação do main.
 *
 * PROIBIDO importar este arquivo no preload: Zod tem dependência de runtime e
 * o preload roda sob `sandbox: true`. Validação mora no processo principal.
 */

/** Canais `invoke` que não recebem payload. */
export const esquemaSemEntrada = z.undefined()

/** URL crua; a allowlist de domínios é aplicada no main antes do openExternal. */
export const esquemaAbrirExterno = z.url()

// ---------------------------------------------------------------------------
// --- auxiliares ---
// ---------------------------------------------------------------------------

const id = z.number().int().positive()
const textoObrigatorio = z.string().trim().min(1)
const textoOpcional = z.string().trim().nullable()
const dataIso = z.iso.datetime()
const valorMonetario = z.number().finite().nonnegative()

/** Canal de operação por id — usado por obter/excluir/confirmar/baixar etc. */
export const esquemaId = z.object({ id })

const estadoEquipamento = z.enum(['otimo', 'bom', 'regular', 'em_manutencao', 'baixado'])
const perfilUsuario = z.enum(['administrador', 'atendente', 'visualizador'])
const formaPagamento = z.enum(['dinheiro', 'pix', 'cartao', 'boleto'])

// ---------------------------------------------------------------------------
// --- categorias (molde para os demais módulos) ---
// ---------------------------------------------------------------------------

export const esquemaCriarCategoria = z.object({
  nome: textoObrigatorio,
  descricao: textoOpcional,
})

export const esquemaAtualizarCategoria = esquemaCriarCategoria.extend({ id })

// ---------------------------------------------------------------------------
// --- equipamentos ---
// ---------------------------------------------------------------------------

export const esquemaCriarEquipamento = z.object({
  nome: textoObrigatorio,
  categoriaId: id,
  precoDiaria: valorMonetario,
  estado: estadoEquipamento,
})

export const esquemaAtualizarEquipamento = esquemaCriarEquipamento.extend({ id })

export const esquemaEquipamentosDisponiveis = z.object({
  inicio: dataIso,
  fim: dataIso,
  categoriaId: id.nullable(),
})

// ---------------------------------------------------------------------------
// --- clientes ---
// ---------------------------------------------------------------------------

export const esquemaCriarCliente = z.object({
  nome: textoObrigatorio,
  email: z.email().nullable(),
  telefone: textoOpcional,
})

export const esquemaAtualizarCliente = esquemaCriarCliente.extend({ id })

// ---------------------------------------------------------------------------
// --- fornecedores ---
// ---------------------------------------------------------------------------

const cnpj = z
  .string()
  .trim()
  .regex(/^\d{14}$/, 'CNPJ deve conter 14 digitos')

export const esquemaCriarFornecedor = z.object({
  razaoSocial: textoObrigatorio,
  cnpj: cnpj.nullable(),
  contato: textoOpcional,
  telefone: textoOpcional,
})

export const esquemaAtualizarFornecedor = esquemaCriarFornecedor.extend({ id })

// ---------------------------------------------------------------------------
// --- reservas ---
// ---------------------------------------------------------------------------

export const esquemaPeriodo = z.object({
  inicio: dataIso,
  fim: dataIso,
})

export const esquemaCriarReserva = z.object({
  clienteId: id,
  equipamentoId: id,
  inicio: dataIso,
  fim: dataIso,
})

export const esquemaAtualizarReserva = esquemaCriarReserva.extend({ id })

// ---------------------------------------------------------------------------
// --- devolucoes e multas ---
// ---------------------------------------------------------------------------

export const esquemaRegistrarDevolucao = z.object({
  reservaId: id,
  devolvidaEm: dataIso,
  estadoRecebido: estadoEquipamento,
  observacoes: textoOpcional,
})

export const esquemaCalcularMulta = z.object({
  reservaId: id,
  devolvidaEm: dataIso,
})

// ---------------------------------------------------------------------------
// --- pagamentos ---
// ---------------------------------------------------------------------------

export const esquemaRegistrarPagamento = z.object({
  reservaId: id,
  valor: valorMonetario,
  pagoEm: dataIso,
  forma: formaPagamento,
  observacoes: textoOpcional,
})

// ---------------------------------------------------------------------------
// --- manutencoes ---
// ---------------------------------------------------------------------------

export const esquemaAbrirManutencao = z.object({
  equipamentoId: id,
  fornecedorId: id.nullable(),
  descricao: textoObrigatorio,
})

export const esquemaConcluirManutencao = z.object({
  id,
  concluidaEm: dataIso,
})

// ---------------------------------------------------------------------------
// --- usuarios ---
// ---------------------------------------------------------------------------

export const esquemaCriarUsuario = z.object({
  nome: textoObrigatorio,
  login: textoObrigatorio,
  perfil: perfilUsuario,
})

export const esquemaAtualizarUsuario = z.object({
  id,
  nome: textoObrigatorio,
  perfil: perfilUsuario,
  ativo: z.boolean(),
})

export const esquemaAutenticar = z.object({
  login: textoObrigatorio,
  senha: z.string().min(1),
})

// ---------------------------------------------------------------------------
// --- integracoes externas ---
// ---------------------------------------------------------------------------

export const esquemaCepBuscar = z.object({
  cep: z
    .string()
    .trim()
    .regex(/^\d{8}$/, 'CEP deve conter 8 digitos'),
})

export const esquemaClimaPrevisao = z.object({
  data: z.iso.date(),
  local: textoObrigatorio,
})

export const esquemaCnpjBuscar = z.object({
  cnpj,
})

export const esquemaFeriadosListar = z.object({
  ano: z.number().int().min(2000).max(2100),
  uf: z.string().trim().length(2).toUpperCase(),
})

// ---------------------------------------------------------------------------
// --- recursos nativos (main decide; preload só transporta) ---
// ---------------------------------------------------------------------------

const nomeArquivoSeguro = z.string().trim().min(1).max(120).regex(/^[^\\/:*?"<>|]+$/)
const extensoesArquivo = z.array(z.string().regex(/^\.[a-z0-9]+$/i)).min(1).max(10)
const caminhoBanco = z.string().trim().min(1).max(260).regex(/\.db$/i)
const textoCifrado = z
  .string()
  .trim()
  .min(4)
  .max(8192)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Texto cifrado deve estar em base64')

export const esquemaAbrirArquivo = z.object({
  titulo: textoObrigatorio.max(80),
  extensoes: extensoesArquivo,
})

export const esquemaSalvarArquivo = z.object({
  titulo: textoObrigatorio.max(80),
  nomePadrao: nomeArquivoSeguro,
  extensoes: extensoesArquivo,
})

export const esquemaBackupBanco = z.object({ destino: caminhoBanco })

export const esquemaRestaurarBanco = z.object({ origem: caminhoBanco })

export const esquemaExportarCsv = z.object({
  nomeArquivo: nomeArquivoSeguro.regex(/\.csv$/i, 'Nome deve terminar em .csv'),
  colunas: z.array(textoObrigatorio.max(80)).min(1).max(40),
  linhas: z
    .array(z.array(z.union([z.string().max(1000), z.number().finite(), z.null()])).max(40))
    .max(5000),
})

export const esquemaNotificacaoDevolucaoAtraso = z.object({
  quantidade: z.number().int().positive(),
  detalhes: z.string().trim().max(240).nullable(),
})

export const esquemaSafeStorageCifrar = z.object({
  texto: z.string().min(1).max(4096),
})

export const esquemaSafeStorageDecifrar = z.object({ textoCifrado })

// ---------------------------------------------------------------------------
// --- schema de erro (formato único da ponte) ---
// ---------------------------------------------------------------------------

export const esquemaErroApi = z.object({
  codigo: z.enum([
    'VALIDACAO',
    'NAO_ENCONTRADO',
    'CONFLITO',
    'REGRA_NEGOCIO',
    'INTEGRACAO_INDISPONIVEL',
    'SEM_PERMISSAO',
    'INTERNO',
  ]),
  mensagem: z.string(),
  canal: z.string(),
})
