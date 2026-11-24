import { createHash } from 'node:crypto'
import type {
  CriarCheckoutStripePayload,
  FormaPagamentoCheckout,
  SessaoCheckoutStripe,
} from '../../../shared/contratos/modelos'
import type { ConfiguracaoStripe } from './configuracao'
import { ErroStripe, erroPorStatusHttp, normalizarErroStripe } from './erros'
import { analisarRespostaCheckout } from './tipos'

/** `typeof fetch` mantém a porta de rede injetável nos testes. */
type ClienteHttp = typeof fetch

const METODOS_PAGAMENTO: Readonly<Record<FormaPagamentoCheckout, string>> = {
  cartao: 'card',
  pix: 'pix',
}

function comIdDaSessao(url: string): string {
  const separador = url.includes('?') ? '&' : '?'
  return `${url}${separador}session_id={CHECKOUT_SESSION_ID}`
}

/** Chave estável por cobrança: um retry não cria duas sessões. */
function chaveIdempotencia(payload: CriarCheckoutStripePayload): string {
  const base =
    payload.reservaId === undefined
      ? JSON.stringify(payload)
      : `${payload.tipo}:${payload.reservaId}:${payload.valorCentavos}`
  return createHash('sha256').update(base).digest('hex')
}

/**
 * Único ponto de acesso HTTP à Stripe. Roda no main: o renderer nunca vê
 * chave secreta, cabeçalhos nem a resposta crua da API.
 */
export class StripeApiServico {
  constructor(
    private readonly configuracao: ConfiguracaoStripe,
    private readonly http: ClienteHttp = (entrada, init) => fetch(entrada, init),
  ) {}

  async criarCheckout(payload: CriarCheckoutStripePayload): Promise<SessaoCheckoutStripe> {
    const corpo = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': this.configuracao.moeda,
      'line_items[0][price_data][product_data][name]': payload.descricao,
      'line_items[0][price_data][unit_amount]': String(payload.valorCentavos),
      'line_items[0][quantity]': '1',
      'payment_method_types[0]': METODOS_PAGAMENTO[payload.forma],
      success_url: comIdDaSessao(this.configuracao.urlSucesso),
      cancel_url: this.configuracao.urlCancelamento,
      'metadata[tipo]': payload.tipo,
    })

    if (payload.reservaId !== undefined) {
      corpo.set('metadata[reservaId]', String(payload.reservaId))
    }
    if (payload.clienteEmail !== undefined) {
      corpo.set('customer_email', payload.clienteEmail)
    }

    try {
      const resposta = await this.http(`${this.configuracao.urlBase}/v1/checkout/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configuracao.chaveSecreta}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': chaveIdempotencia(payload),
        },
        body: corpo.toString(),
        signal: AbortSignal.timeout(this.configuracao.timeoutMs),
      })

      if (!resposta.ok) {
        throw erroPorStatusHttp(resposta.status)
      }

      let bruto: unknown
      try {
        bruto = await resposta.json()
      } catch {
        throw new ErroStripe(
          'RESPOSTA_INVALIDA',
          'O serviço de pagamentos devolveu uma resposta inesperada. Tente novamente.',
        )
      }
      return analisarRespostaCheckout(bruto)
    } catch (erro) {
      // Nunca propaga stack, body, headers ou mensagem crua da Stripe.
      throw normalizarErroStripe(erro)
    }
  }
}
