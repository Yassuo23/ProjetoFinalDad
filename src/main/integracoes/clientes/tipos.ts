import { z } from 'zod'
import type { Cliente } from '../../../shared/contratos/modelos'
import { ErroApiClientes } from './erros'

/**
 * DTO mínimo da resposta da API de clientes. Campos não usados são descartados:
 * nada cru da API externa atravessa a ponte IPC.
 */
const esquemaClienteApi = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).max(200),
  email: z.email().nullable(),
  telefone: z.string().max(30).nullable(),
  cep: z.string().max(20).nullable().optional(),
  logradouro: z.string().max(200).nullable().optional(),
  numero: z.string().max(20).nullable().optional(),
  complemento: z.string().max(200).nullable().optional(),
  bairro: z.string().max(120).nullable().optional(),
  cidade: z.string().max(120).nullable().optional(),
  uf: z.string().length(2).nullable().optional(),
})

const esquemaRespostaClientes = z.object({
  dados: z.array(esquemaClienteApi),
  total: z.number().int().nonnegative(),
})

export function analisarRespostaClientes(bruto: unknown): Cliente[] {
  const resultado = esquemaRespostaClientes.safeParse(bruto)
  if (!resultado.success) {
    throw new ErroApiClientes(
      'RESPOSTA_INVALIDA',
      'O serviço de clientes devolveu uma resposta inesperada. Tente novamente.',
    )
  }

  return resultado.data.dados.map((cliente) => ({
    id: cliente.id,
    nome: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
    cep: cliente.cep,
    logradouro: cliente.logradouro,
    numero: cliente.numero,
    complemento: cliente.complemento,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    uf: cliente.uf,
  }))
}
