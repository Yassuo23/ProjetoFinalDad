import { describe, expect, it } from 'vitest'
import { analisarRespostaCheckout } from './tipos'
import type { ConfiguracaoStripe } from './configuracao'
import { ErroConfiguracaoStripe, lerConfiguracaoStripe } from './configuracao'
import { ErroStripe } from './erros'
import { StripeApiServico } from './StripeApiServico'

const CONFIGURACAO: ConfiguracaoStripe = {
  chaveSecreta: 'sk_test_123',
  urlBase: 'https://api.stripe.com',
  urlSucesso: 'https://loja.example/pagamentos/sucesso',
  urlCancelamento: 'https://loja.example/pagamentos/cancelado',
  moeda: 'brl',
  timeoutMs: 10_000,
}

const PAYLOAD = {
  tipo: 'reserva' as const,
  valorCentavos: 33_000,
  descricao: 'Reserva #1042',
  clienteEmail: 'ana@example.com',
  forma: 'cartao' as const,
  reservaId: 1042,
}

interface Chamada {
  readonly url: string
  readonly init: RequestInit
}

function respostaCheckout(): Response {
  return new Response(
    JSON.stringify({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      status: 'open',
      expires: 1_800_000_000,
      objeto: 'checkout.session',
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

async function capturarErro(promessa: Promise<unknown>): Promise<ErroStripe> {
  const erro = await promessa.catch((motivo: unknown) => motivo)
  if (!(erro instanceof ErroStripe)) {
    throw new Error(`Esperado ErroStripe, recebido: ${String(erro)}`)
  }
  return erro
}

describe('StripeApiServico', () => {
  it('cria a sessão com autenticação, timeout e DTO validado', async () => {
    const chamadas: Chamada[] = []
    const http: typeof fetch = async (entrada, init) => {
      chamadas.push({ url: String(entrada), init: init ?? {} })
      return respostaCheckout()
    }
    const servico = new StripeApiServico(CONFIGURACAO, http)

    const sessao = await servico.criarCheckout(PAYLOAD)

    expect(sessao).toEqual({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      status: 'open',
      expiraEm: 1_800_000_000,
    })

    const chamada = chamadas[0]
    expect(chamada.url).toBe('https://api.stripe.com/v1/checkout/sessions')
    expect(chamada.init.method).toBe('POST')
    expect(chamada.init.signal).toBeInstanceOf(AbortSignal)

    const cabecalhos = new Headers(chamada.init.headers)
    expect(cabecalhos.get('Authorization')).toBe('Bearer sk_test_123')
    expect(cabecalhos.get('Content-Type')).toBe('application/x-www-form-urlencoded')
    expect(cabecalhos.get('Idempotency-Key')).toMatch(/^[a-f0-9]{64}$/)

    const corpo = new URLSearchParams(String(chamada.init.body))
    expect(corpo.get('mode')).toBe('payment')
    expect(corpo.get('line_items[0][price_data][unit_amount]')).toBe('33000')
    expect(corpo.get('line_items[0][price_data][product_data][name]')).toBe('Reserva #1042')
    expect(corpo.get('payment_method_types[0]')).toBe('card')
    expect(corpo.get('customer_email')).toBe('ana@example.com')
    expect(corpo.get('metadata[reservaId]')).toBe('1042')
    expect(corpo.get('success_url')).toContain('{CHECKOUT_SESSION_ID}')
  })

  it('usa payment_method_types=pix quando a forma é Pix', async () => {
    let corpoRecebido = ''
    const http: typeof fetch = async (_entrada, init) => {
      corpoRecebido = String(init?.body)
      return respostaCheckout()
    }
    const servico = new StripeApiServico(CONFIGURACAO, http)

    await servico.criarCheckout({ ...PAYLOAD, forma: 'pix' })

    expect(new URLSearchParams(corpoRecebido).get('payment_method_types[0]')).toBe('pix')
  })

  it('reutiliza a chave de idempotência para o mesmo payload', async () => {
    const chaves: string[] = []
    const http: typeof fetch = async (_entrada, init) => {
      chaves.push(new Headers(init?.headers).get('Idempotency-Key') ?? '')
      return respostaCheckout()
    }
    const servico = new StripeApiServico(CONFIGURACAO, http)

    await servico.criarCheckout(PAYLOAD)
    await servico.criarCheckout(PAYLOAD)

    expect(chaves[0]).toBe(chaves[1])
    expect(chaves[0]).not.toBe('')
  })

  it('transforma erro de autenticação em mensagem segura', async () => {
    const http: typeof fetch = async () => new Response('{}', { status: 401 })
    const servico = new StripeApiServico(CONFIGURACAO, http)

    const erro = await capturarErro(servico.criarCheckout(PAYLOAD))

    expect(erro.codigo).toBe('HTTP')
    expect(erro.statusHttp).toBe(401)
    expect(erro.message).toContain('não está configurada corretamente')
    expect(erro.message).not.toContain(CONFIGURACAO.chaveSecreta)
  })

  it('transforma timeout em erro amigável', async () => {
    const http: typeof fetch = async () => {
      throw Object.assign(new Error('expirou'), { name: 'TimeoutError' })
    }
    const servico = new StripeApiServico(CONFIGURACAO, http)

    const erro = await capturarErro(servico.criarCheckout(PAYLOAD))

    expect(erro.codigo).toBe('TIMEOUT')
    expect(erro.message).toContain('demorou para responder')
  })

  it('rejeita resposta com URL de checkout fora do domínio Stripe', async () => {
    const http: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: 'cs_test_123',
          url: 'https://evil.example/pagar',
          status: 'open',
          expires: 1_800_000_000,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    const servico = new StripeApiServico(CONFIGURACAO, http)

    const erro = await capturarErro(servico.criarCheckout(PAYLOAD))

    expect(erro.codigo).toBe('RESPOSTA_INVALIDA')
  })

  it('rejeita JSON inválido sem vazar o corpo da resposta', async () => {
    const http: typeof fetch = async () =>
      new Response('{invalido', { status: 200, headers: { 'content-type': 'application/json' } })
    const servico = new StripeApiServico(CONFIGURACAO, http)

    const erro = await capturarErro(servico.criarCheckout(PAYLOAD))

    expect(erro.codigo).toBe('RESPOSTA_INVALIDA')
    expect(erro.message).not.toContain('{invalido')
  })
})

describe('analisarRespostaCheckout', () => {
  it('descarta campos extras e devolve somente o DTO da aplicação', () => {
    const sessao = analisarRespostaCheckout({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
      status: 'complete',
      expires: 1_800_000_000,
      livemode: false,
      payment_method_types: ['card'],
    })

    expect(sessao).toEqual({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
      status: 'complete',
      expiraEm: 1_800_000_000,
    })
    expect(Object.keys(sessao)).toHaveLength(4)
  })
})

describe('lerConfiguracaoStripe', () => {
  const AMBIENTE_BASE = {
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_API_BASE_URL: 'https://api.stripe.com',
    STRIPE_SUCCESS_URL: 'https://loja.example/sucesso',
    STRIPE_CANCEL_URL: 'https://loja.example/cancelado',
  }

  it('recusa chave publicável no lugar da chave secreta', () => {
    expect(() => lerConfiguracaoStripe({ ...AMBIENTE_BASE, STRIPE_SECRET_KEY: 'pk_test_123' })).toThrow(
      ErroConfiguracaoStripe,
    )
  })

  it('recusa URL base da API com caminho', () => {
    expect(() =>
      lerConfiguracaoStripe({ ...AMBIENTE_BASE, STRIPE_API_BASE_URL: 'https://api.stripe.com/v1' }),
    ).toThrow(ErroConfiguracaoStripe)
  })

  it('recusa host diferente de api.stripe.com', () => {
    expect(() =>
      lerConfiguracaoStripe({ ...AMBIENTE_BASE, STRIPE_API_BASE_URL: 'https://stripe.example' }),
    ).toThrow(ErroConfiguracaoStripe)
  })
})
