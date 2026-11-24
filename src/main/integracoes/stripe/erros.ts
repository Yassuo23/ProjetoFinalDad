/** Erros da integração Stripe, já normalizados para a aplicação. */
export type CodigoErroStripe =
  | 'CONFIGURACAO'
  | 'REDE'
  | 'TIMEOUT'
  | 'HTTP'
  | 'RESPOSTA_INVALIDA'

export class ErroStripe extends Error {
  constructor(
    readonly codigo: CodigoErroStripe,
    mensagem: string,
    readonly statusHttp?: number,
  ) {
    super(mensagem)
    this.name = 'ErroStripe'
  }
}

function nomeDoErro(erro: unknown): string | undefined {
  if (typeof erro !== 'object' || erro === null || !('name' in erro)) return undefined
  return typeof erro.name === 'string' ? erro.name : undefined
}

/** Converte qualquer falha de rede/parse em um erro seguro para o renderer. */
export function normalizarErroStripe(erro: unknown): ErroStripe {
  if (erro instanceof ErroStripe) return erro

  const nome = nomeDoErro(erro)
  if (nome === 'TimeoutError' || nome === 'AbortError') {
    return new ErroStripe(
      'TIMEOUT',
      'O pagamento demorou para responder. Tente novamente em instantes.',
    )
  }

  return new ErroStripe(
    'REDE',
    'Não foi possível conectar ao serviço de pagamentos. Verifique sua conexão e tente novamente.',
  )
}

/** Não expõe mensagens cruas da Stripe (podem conter detalhes da conta). */
export function erroPorStatusHttp(status: number): ErroStripe {
  if (status === 401 || status === 403) {
    return new ErroStripe(
      'HTTP',
      'A integração de pagamentos não está configurada corretamente. Contate o administrador.',
      status,
    )
  }
  if (status === 429) {
    return new ErroStripe(
      'HTTP',
      'Muitas tentativas de pagamento. Aguarde um momento e tente novamente.',
      status,
    )
  }
  if (status >= 500) {
    return new ErroStripe(
      'HTTP',
      'O serviço de pagamentos está temporariamente indisponível. Tente novamente em instantes.',
      status,
    )
  }

  return new ErroStripe(
    'HTTP',
    'Não foi possível iniciar o pagamento. Confira os dados e tente novamente.',
    status,
  )
}
