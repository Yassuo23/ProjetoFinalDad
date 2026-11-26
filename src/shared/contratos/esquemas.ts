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
// Blocos reutilizáveis
// ---------------------------------------------------------------------------

const texto = (max: number): z.ZodString => z.string().trim().min(1).max(max)
const textoOpcional = (max: number) => z.string().trim().max(max).nullish()
const textoFiltro = (max: number) => z.string().trim().min(1).max(max).optional()
const decimal = z.number().finite().nonnegative()
const data = z.iso.date()
const dataHoraOpcional = z.iso.datetime().nullish()
const id = z.number().int().positive()
const limite = z.number().int().positive().max(500).optional()
const deslocamento = z.number().int().nonnegative().optional()
const incluirInativos = z.boolean().optional()

/** Normalização e dígitos verificadores no mesmo formato do `CnpjServico`. */
export function normalizarCpf(valor: string): string {
  return valor.replace(/\D/g, '')
}

function digitoVerificadorCpf(base: string, pesos: readonly number[]): number {
  const soma = pesos.reduce((total, peso, indice) => total + Number(base[indice]) * peso, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cpfValido(valor: string): boolean {
  const digitos = normalizarCpf(valor)
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false
  const primeiro = digitoVerificadorCpf(digitos.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  if (primeiro !== Number(digitos[9])) return false
  const segundo = digitoVerificadorCpf(digitos.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return segundo === Number(digitos[10])
}

const cpf = texto(14)
  .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF_INVALIDO')
  .refine(cpfValido, 'CPF_INVALIDO')
const cnpj = texto(20).regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ_INVALIDO')
const cep = texto(10).regex(/^\d{5}-?\d{3}$/, 'CEP_INVALIDO')
const uf = z.string().trim().length(2).regex(/^[A-Z]{2}$/, 'UF_INVALIDA').nullish()

const categoria = z.enum(['Bicicleta', 'Caiaque', 'Prancha', 'Camping'])
const estadoConservacao = z.enum(['Novo', 'Bom', 'Desgastado', 'Em Manutenção'])
const disponibilidade = z.enum(['Disponível', 'Indisponível', 'Em manutenção'])
const tipoFornecedor = z.enum(['Compra', 'Manutenção', 'Ambos']).nullish()
const tipoFornecedorFiltro = z.enum(['Compra', 'Manutenção', 'Ambos']).optional()
const statusReserva = z.enum(['Pendente', 'Confirmada', 'Cancelada', 'Concluída'])
const formaPagamento = z.enum(['Pix', 'Cartão de Crédito', 'Dinheiro']).nullish()
const formaPagamentoFiltro = z.enum(['Pix', 'Cartão de Crédito', 'Dinheiro']).optional()
const statusPagamento = z.enum(['Pendente', 'Pago', 'Estornado'])
const estadoPosUso = z.enum(['Perfeito', 'Com avarias leves', 'Danificado'])
const tipoPagamento = z.enum(['Reserva', 'Multa']).optional()
const perfilUsuario = z.enum(['Administrador', 'Atendente', 'Cliente'])
/** Canal administrativo nunca cria/promove a perfil Cliente (ADR 0009). */
const perfilUsuarioStaff = z.enum(['Administrador', 'Atendente'])
const statusManutencao = z.enum(['Aberta', 'Em andamento', 'Concluída'])
const login = z.string().trim().min(3).max(80)
const senha = z
  .string()
  .min(8)
  .max(128)
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'SENHA_FRACA')
const ano = z.number().int().min(2020).max(2100)

export const esquemaId = z.object({ id })

export const esquemaChaveItemReserva = z.object({
  reservaId: id,
  equipamentoId: id,
})

function esquemaAtualizacao<T extends z.ZodRawShape>(campos: T) {
  return esquemaId.extend(campos).refine(
    (dados) =>
      Object.keys(dados as Record<string, unknown>).some(
        (chave) => chave !== 'id' && (dados as Record<string, unknown>)[chave] !== undefined,
      ),
    { message: 'NENHUM_CAMPO_PARA_ATUALIZAR' },
  )
}

function periodoValido(entrada: { dataInicio: string; dataFim: string }): boolean {
  return entrada.dataInicio <= entrada.dataFim
}

// ---------------------------------------------------------------------------
// Fornecedores
// ---------------------------------------------------------------------------

export const esquemaFornecedorListar = z
  .object({
    nome: textoFiltro(150),
    tipo: tipoFornecedorFiltro,
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

export const esquemaFornecedorCriar = z.object({
  nome: texto(150),
  cnpj,
  telefone: textoOpcional(20),
  email: z.email().max(100).nullish(),
  tipo: tipoFornecedor,
})

export const esquemaFornecedorAtualizar = esquemaAtualizacao({
  nome: texto(150).optional(),
  cnpj: cnpj.optional(),
  telefone: textoOpcional(20),
  email: z.email().max(100).nullish(),
  tipo: tipoFornecedor,
})

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export const esquemaClienteListar = z
  .object({
    nome: textoFiltro(150),
    cpf: textoFiltro(14),
    cidade: textoFiltro(100),
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

const camposEndereco = {
  cep: cep.nullish(),
  logradouro: textoOpcional(150),
  numero: textoOpcional(20),
  complemento: textoOpcional(50),
  bairro: textoOpcional(100),
  cidade: textoOpcional(100),
  uf,
}

export const esquemaClienteCriar = z.object({
  nome: texto(150),
  cpf,
  telefone: textoOpcional(20),
  email: z.email().max(100).nullish(),
  ...camposEndereco,
})

export const esquemaClienteAtualizar = esquemaAtualizacao({
  nome: texto(150).optional(),
  cpf: cpf.optional(),
  telefone: textoOpcional(20),
  email: z.email().max(100).nullish(),
  cep: cep.nullish(),
  logradouro: textoOpcional(150),
  numero: textoOpcional(20),
  complemento: textoOpcional(50),
  bairro: textoOpcional(100),
  cidade: textoOpcional(100),
  uf,
})

export const esquemaBuscarCep = z.object({ cep })

// ---------------------------------------------------------------------------
// Equipamentos
// ---------------------------------------------------------------------------

export const esquemaEquipamentoListar = z
  .object({
    nome: textoFiltro(150),
    categoria: categoria.optional(),
    estadoConservacao: estadoConservacao.optional(),
    disponibilidade: disponibilidade.optional(),
    fornecedorId: id.optional(),
    somenteDisponiveis: z.boolean().optional(),
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

export const esquemaEquipamentoCriar = z.object({
  nome: texto(150),
  categoria,
  estadoConservacao,
  // Chamadas antigas não enviam o campo: o main resolve o default antes do serviço.
  disponibilidade: disponibilidade.optional().default('Disponível'),
  fornecedorId: id.nullish(),
  // Ausente em chamadas antigas: default explícito mantém compatibilidade (ADR 0007).
  valorDiaria: decimal.optional().default(0),
})

export const esquemaEquipamentoAtualizar = esquemaAtualizacao({
  nome: texto(150).optional(),
  categoria: categoria.optional(),
  estadoConservacao: estadoConservacao.optional(),
  disponibilidade: disponibilidade.optional(),
  fornecedorId: id.nullish(),
  valorDiaria: decimal.optional(),
})

export const esquemaPeriodo = z
  .object({ dataInicio: data, dataFim: data, reservaId: id.optional() })
  .refine(periodoValido, { message: 'PERIODO_INVALIDO' })

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

const itemReserva = z.object({ equipamentoId: id, valorDiaria: decimal })

export const esquemaReservaListar = z
  .object({
    clienteId: id.optional(),
    statusReserva: statusReserva.optional(),
    dataInicio: data.optional(),
    dataFim: data.optional(),
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

export const esquemaReservaCriar = z
  .object({
    clienteId: id,
    dataInicio: data,
    dataFim: data,
    itens: z.array(itemReserva).min(1),
    previsaoTempo: textoOpcional(2000),
  })
  .refine(periodoValido, { message: 'PERIODO_INVALIDO' })
  .refine(
    (dados) => new Set(dados.itens.map((item) => item.equipamentoId)).size === dados.itens.length,
    { message: 'EQUIPAMENTO_DUPLICADO' },
  )

export const esquemaReservaAtualizar = esquemaAtualizacao({
  clienteId: id.optional(),
  dataInicio: data.optional(),
  dataFim: data.optional(),
  statusReserva: statusReserva.optional(),
  previsaoTempo: textoOpcional(2000),
  itens: z.array(itemReserva).min(1).optional(),
})

// ---------------------------------------------------------------------------
// Itens de reserva
// ---------------------------------------------------------------------------

export const esquemaItemReservaListar = z
  .object({ reservaId: id.optional(), equipamentoId: id.optional(), limite, deslocamento })
  .optional()

export const esquemaItemReservaCriar = esquemaChaveItemReserva.extend({ valorDiaria: decimal })

export const esquemaItemReservaAtualizar = esquemaChaveItemReserva.extend({
  valorDiaria: decimal.optional(),
})

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export const esquemaPagamentoListar = z
  .object({
    reservaId: id.optional(),
    statusPagamento: statusPagamento.optional(),
    formaPagamento: formaPagamentoFiltro,
    dataInicio: data.optional(),
    dataFim: data.optional(),
    tipo: tipoPagamento,
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

export const esquemaPagamentoCriar = z.object({
  reservaId: id,
  valorBase: decimal,
  valorMulta: decimal.optional(),
  formaPagamento,
  statusPagamento: statusPagamento.optional(),
  dataPagamento: dataHoraOpcional,
})

export const esquemaPagamentoAtualizar = esquemaAtualizacao({
  reservaId: id.optional(),
  valorBase: decimal.optional(),
  valorMulta: decimal.optional(),
  formaPagamento,
  statusPagamento: statusPagamento.optional(),
  dataPagamento: dataHoraOpcional,
})

// ---------------------------------------------------------------------------
// Devoluções
// ---------------------------------------------------------------------------

export const esquemaDevolucaoListar = z
  .object({
    reservaId: id.optional(),
    estadoPosUso: estadoPosUso.optional(),
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

export const esquemaDevolucaoCriar = z.object({
  reservaId: id,
  dataDevolucaoEfetiva: z.iso.datetime().optional(),
  estadoPosUso,
  observacoes: textoOpcional(2000),
})

export const esquemaDevolucaoAtualizar = esquemaAtualizacao({
  dataDevolucaoEfetiva: z.iso.datetime().optional(),
  estadoPosUso: estadoPosUso.optional(),
  observacoes: textoOpcional(2000),
})

// ---------------------------------------------------------------------------
// Autenticação e usuários (ADR 0007)
// ---------------------------------------------------------------------------

export const esquemaAuthEntrar = z.object({ login, senha })

/** Sem senha padrão: a senha do primeiro administrador vem do payload. */
export const esquemaAuthBootstrap = z.object({ nome: texto(150), login, senha })

/**
 * ADR 0009: auto-cadastro público. `strict()` recusa `perfil` (e qualquer campo
 * extra) antes do handler; o serviço fixa `'Cliente'` por literal e valida de novo.
 */
export const esquemaCadastroCliente = z
  .object({
    nome: texto(150),
    cpf,
    login,
    senha,
    telefone: textoOpcional(20),
    email: z.email().max(100).nullish(),
    ...camposEndereco,
  })
  .strict()

export const esquemaUsuarioListar = z
  .object({
    nome: textoFiltro(150),
    login: textoFiltro(80),
    perfil: perfilUsuario.optional(),
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

export const esquemaUsuarioCriar = z.object({
  nome: texto(150),
  login,
  senha,
  perfil: perfilUsuarioStaff,
})

export const esquemaUsuarioAtualizar = esquemaAtualizacao({
  nome: texto(150).optional(),
  login: login.optional(),
  perfil: perfilUsuarioStaff.optional(),
  ativo: z.boolean().optional(),
})

export const esquemaUsuarioAlterarSenha = esquemaId.extend({
  senhaNova: senha,
  senhaAtual: senha.optional(),
})

// ---------------------------------------------------------------------------
// Categorias — CRUD completo (ADR 0007)
// ---------------------------------------------------------------------------

export const esquemaCategoriaListar = z
  .object({ nome: textoFiltro(150), limite, deslocamento, incluirInativos })
  .optional()

export const esquemaCategoriaCriar = z.object({ nome: texto(150), descricao: textoOpcional(500) })

export const esquemaCategoriaAtualizar = esquemaAtualizacao({
  nome: texto(150).optional(),
  descricao: textoOpcional(500),
})

// ---------------------------------------------------------------------------
// Manutenção (ADR 0007)
// ---------------------------------------------------------------------------

export const esquemaManutencaoListar = z
  .object({
    equipamentoId: id.optional(),
    fornecedorId: id.optional(),
    status: statusManutencao.optional(),
    dataEnvio: data.optional(),
    dataRetornoPrevista: data.optional(),
    limite,
    deslocamento,
    incluirInativos,
  })
  .optional()

export const esquemaManutencaoCriar = z.object({
  equipamentoId: id,
  fornecedorId: id.nullish(),
  descricao: texto(2000),
  dataEnvio: data,
  dataRetornoPrevista: data.nullish(),
  custo: decimal.nullish(),
  status: statusManutencao.optional().default('Aberta'),
})

export const esquemaManutencaoAtualizar = esquemaAtualizacao({
  equipamentoId: id.optional(),
  fornecedorId: id.nullish(),
  descricao: texto(2000).optional(),
  dataEnvio: data.optional(),
  dataRetornoPrevista: data.nullish(),
  dataRetorno: data.nullish(),
  custo: decimal.nullish(),
  status: statusManutencao.optional(),
})

export const esquemaManutencaoConcluir = esquemaId.extend({
  dataRetorno: data.optional(),
  custo: decimal.nullish(),
})

// ---------------------------------------------------------------------------
// Integrações — payloads curtos; falha de upstream vira `estado: indisponivel`
// ---------------------------------------------------------------------------

/** A data é o único parâmetro: cidade/latitude vivem na config do main. */
export const esquemaIntegracaoPrevisaoTempo = z.object({ data })
export const esquemaIntegracaoCnpj = z.object({ cnpj })
export const esquemaIntegracaoFeriados = z.object({ ano })

// ---------------------------------------------------------------------------
// Agregações e cálculo de multa (ADR 0007)
// ---------------------------------------------------------------------------

export const esquemaDevolucoesListarPendentes = z.object({ data: data.optional() }).optional()
export const esquemaCalcularMulta = z.object({ reservaId: id, dataDevolucao: data })
export const esquemaResumoDashboard = z.object({ data: data.optional() }).optional()
