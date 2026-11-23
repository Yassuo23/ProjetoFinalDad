import { z } from 'zod'
import { ESTADOS_EQUIPAMENTO } from './estados'

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

const esquemaId = z.object({ id: z.number().int().positive() })
const esquemaEstado = z.enum(ESTADOS_EQUIPAMENTO)
const esquemaDescricao = z.string().trim().max(500).nullish()

export const esquemaEquipamentoListar = z
  .object({
    categoriaId: z.number().int().positive().optional(),
    estado: esquemaEstado.optional(),
  })
  .optional()

export const esquemaEquipamentoBuscarPorId = esquemaId
export const esquemaEquipamentoInativar = esquemaId

export const esquemaEquipamentoCriar = z.object({
  nome: z.string().trim().min(1).max(120),
  categoriaId: z.number().int().positive(),
  precoDiaria: z.number().nonnegative(),
  valorAquisicao: z.number().nonnegative(),
  descricao: esquemaDescricao,
})

export const esquemaEquipamentoAtualizar = esquemaId.extend({
  nome: z.string().trim().min(1).max(120).optional(),
  categoriaId: z.number().int().positive().optional(),
  precoDiaria: z.number().nonnegative().optional(),
  valorAquisicao: z.number().nonnegative().optional(),
  estado: esquemaEstado.optional(),
  descricao: esquemaDescricao,
})

export const esquemaEquipamentoListarDisponiveis = z
  .object({
    inicio: z.iso.datetime(),
    fim: z.iso.datetime(),
    categoriaId: z.number().int().positive().optional(),
  })
  .refine((periodo) => periodo.inicio < periodo.fim, { message: 'PERIODO_INVALIDO' })

// P2 — Clientes e CEP

/** Aceita 01001-000 e 01001000; a normalização para dígitos é do serviço no main. */
const esquemaCep = z.string().regex(/^\d{5}-?\d{3}$/, 'CEP_INVALIDO')
const esquemaTextoOpcional = z.string().trim().max(120).nullish()
const esquemaEmail = z.email().nullish()

export const esquemaClienteListar = z
  .object({
    nome: z.string().trim().max(120).optional(),
    ativo: z.boolean().optional(),
  })
  .optional()

export const esquemaClienteBuscarPorId = esquemaId
export const esquemaClienteInativar = esquemaId
export const esquemaConsultarCep = z.object({ cep: esquemaCep })

const camposCliente = {
  email: esquemaEmail,
  telefone: z.string().trim().max(20).nullish(),
  cep: esquemaCep.nullish(),
  logradouro: esquemaTextoOpcional,
  numero: z.string().trim().max(10).nullish(),
  complemento: esquemaTextoOpcional,
  bairro: esquemaTextoOpcional,
  cidade: esquemaTextoOpcional,
  uf: z.string().trim().length(2).nullish(),
}

export const esquemaClienteCriar = z.object({
  nome: z.string().trim().min(1).max(120),
  ...camposCliente,
})

export const esquemaClienteAtualizar = esquemaId.extend({
  nome: z.string().trim().min(1).max(120).optional(),
  ...camposCliente,
})
