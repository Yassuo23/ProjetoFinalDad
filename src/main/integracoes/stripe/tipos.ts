import { z } from 'zod'
import type { SessaoCheckoutStripe } from '../../../shared/contratos/modelos'
import { ErroStripe } from './erros'

/**
 * DTO mínimo da resposta da Stripe. Campos não usados são descartados:
 * nada cru da API externa atravessa a ponte IPC.
 */
const esquemaRespostaCheckout = z.object({
  id: z.string().min(1),
  url: z.url().refine((valor) => {
    try {
      const url = new URL(valor)
      return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com'
    } catch {
      return false
    }
  }, 'URL de checkout inválida'),
  status: z.enum(['open', 'complete', 'expired']),
  expires: z.number().int().positive(),
})

export function analisarRespostaCheckout(bruto: unknown): SessaoCheckoutStripe {
  const resultado = esquemaRespostaCheckout.safeParse(bruto)
  if (!resultado.success) {
    throw new ErroStripe(
      'RESPOSTA_INVALIDA',
      'O serviço de pagamentos devolveu uma resposta inesperada. Tente novamente.',
    )
  }

  return {
    id: resultado.data.id,
    url: resultado.data.url,
    status: resultado.data.status,
    expiraEm: resultado.data.expires,
  }
}
