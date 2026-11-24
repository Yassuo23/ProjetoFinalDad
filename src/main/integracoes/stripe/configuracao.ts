import { ErroStripe } from './erros'

/** Configuração lida somente no main; nunca é serializada para o renderer. */
export interface ConfiguracaoStripe {
  readonly chaveSecreta: string
  readonly urlBase: string
  readonly urlSucesso: string
  readonly urlCancelamento: string
  readonly moeda: string
  readonly timeoutMs: number
}

export class ErroConfiguracaoStripe extends ErroStripe {
  constructor(mensagem: string) {
    super('CONFIGURACAO', mensagem)
    this.name = 'ErroConfiguracaoStripe'
  }
}

function obrigatorio(nome: string, valor: string | undefined): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErroConfiguracaoStripe(`Variável de ambiente ${nome} não configurada.`)
  }
  return valor.trim()
}

function urlHttps(nome: string, valor: string | undefined): string {
  const bruta = obrigatorio(nome, valor)
  let url: URL
  try {
    url = new URL(bruta)
  } catch {
    throw new ErroConfiguracaoStripe(`${nome} deve ser uma URL absoluta.`)
  }
  if (url.protocol !== 'https:') {
    throw new ErroConfiguracaoStripe(`${nome} deve usar HTTPS.`)
  }
  if (url.username || url.password) {
    throw new ErroConfiguracaoStripe(`${nome} não pode conter credenciais na URL.`)
  }
  // A chave secreta nunca deve ser enviada para um host configurado por engano.
  if (nome === 'STRIPE_API_BASE_URL' && url.hostname.toLowerCase() !== 'api.stripe.com') {
    throw new ErroConfiguracaoStripe('STRIPE_API_BASE_URL deve apontar para api.stripe.com.')
  }
  if (nome === 'STRIPE_API_BASE_URL' && (url.pathname !== '/' || url.search || url.hash)) {
    throw new ErroConfiguracaoStripe(
      'STRIPE_API_BASE_URL deve conter apenas o domínio da API (sem caminho, query ou fragmento).',
    )
  }
  return bruta.replace(/\/+$/, '')
}

function timeout(valor: string | undefined): number {
  const ms = Number(valor ?? '10000')
  if (!Number.isInteger(ms) || ms < 1000 || ms > 60_000) {
    throw new ErroConfiguracaoStripe('STRIPE_TIMEOUT_MS deve ser um inteiro entre 1000 e 60000.')
  }
  return ms
}

function moeda(valor: string | undefined): string {
  const bruta = (valor ?? 'brl').trim().toLowerCase()
  if (!/^[a-z]{3}$/.test(bruta)) {
    throw new ErroConfiguracaoStripe('STRIPE_MOEDA deve ter 3 letras (ex.: brl).')
  }
  return bruta
}

/** Falha cedo se alguma variável necessária estiver ausente ou inválida. */
export function lerConfiguracaoStripe(env: NodeJS.ProcessEnv = process.env): ConfiguracaoStripe {
  const chaveSecreta = obrigatorio('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY)
  if (!chaveSecreta.startsWith('sk_')) {
    throw new ErroConfiguracaoStripe(
      'STRIPE_SECRET_KEY deve ser uma chave secreta da Stripe (prefixo sk_).',
    )
  }

  return {
    chaveSecreta,
    urlBase: urlHttps('STRIPE_API_BASE_URL', env.STRIPE_API_BASE_URL),
    urlSucesso: urlHttps('STRIPE_SUCCESS_URL', env.STRIPE_SUCCESS_URL),
    urlCancelamento: urlHttps('STRIPE_CANCEL_URL', env.STRIPE_CANCEL_URL),
    moeda: moeda(env.STRIPE_MOEDA),
    timeoutMs: timeout(env.STRIPE_TIMEOUT_MS),
  }
}
