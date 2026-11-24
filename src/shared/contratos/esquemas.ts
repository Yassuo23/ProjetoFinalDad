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

/**
 * Parâmetros de `clientes.listar`. Opcional porque a ponte existente é chamada sem
 * argumentos; o main converte `undefined` em `{}` antes de consultar a API.
 */
export const esquemaListarClientes = z
  .object({
    busca: z.string().trim().max(100).optional(),
    limite: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .optional()

/** Payload do checkout Stripe; o valor é inteiro em centavos. */
export const esquemaCriarCheckoutStripe = z
  .object({
    tipo: z.enum(['reserva', 'multa']),
    valorCentavos: z.number().int().positive().max(100_000_000),
    descricao: z.string().min(1).max(200),
    clienteEmail: z.email().optional(),
    forma: z.enum(['cartao', 'pix']),
    reservaId: z.number().int().positive().optional(),
  })
  .strict()
