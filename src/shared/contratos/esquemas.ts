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

const cpf = texto(14).regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF_INVALIDO')
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
})

export const esquemaEquipamentoAtualizar = esquemaAtualizacao({
  nome: texto(150).optional(),
  categoria: categoria.optional(),
  estadoConservacao: estadoConservacao.optional(),
  disponibilidade: disponibilidade.optional(),
  fornecedorId: id.nullish(),
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
