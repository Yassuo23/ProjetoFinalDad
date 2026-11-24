/** Erros da integração com a API de clientes, já normalizados para a aplicação. */
export type CodigoErroApiClientes =
  'CONFIGURACAO' | 'REDE' | 'TIMEOUT' | 'HTTP' | 'RESPOSTA_INVALIDA'

export class ErroApiClientes extends Error {
  constructor(
    readonly codigo: CodigoErroApiClientes,
    mensagem: string,
    readonly statusHttp?: number,
  ) {
    super(mensagem)
    this.name = 'ErroApiClientes'
  }
}

function nomeDoErro(erro: unknown): string | undefined {
  if (typeof erro !== 'object' || erro === null || !('name' in erro)) return undefined
  return typeof erro.name === 'string' ? erro.name : undefined
}

/** Converte qualquer falha de rede/parse em um erro seguro para o renderer. */
export function normalizarErroApiClientes(erro: unknown): ErroApiClientes {
  if (erro instanceof ErroApiClientes) return erro

  const nome = nomeDoErro(erro)
  if (nome === 'TimeoutError' || nome === 'AbortError') {
    return new ErroApiClientes(
      'TIMEOUT',
      'A consulta de clientes demorou para responder. Tente novamente em instantes.',
    )
  }

  return new ErroApiClientes(
    'REDE',
    'Não foi possível consultar os clientes. Verifique sua conexão e tente novamente.',
  )
}

/** Não expõe corpo, headers nem mensagem crua da API externa. */
export function erroPorStatusHttpClientes(status: number): ErroApiClientes {
  if (status === 401 || status === 403) {
    return new ErroApiClientes(
      'HTTP',
      'A consulta de clientes não está autorizada. Contate o administrador.',
      status,
    )
  }
  if (status === 404) {
    return new ErroApiClientes(
      'HTTP',
      'O serviço de clientes não está disponível no momento.',
      status,
    )
  }
  if (status === 429) {
    return new ErroApiClientes(
      'HTTP',
      'Muitas consultas de clientes. Aguarde um momento e tente novamente.',
      status,
    )
  }
  if (status >= 500) {
    return new ErroApiClientes(
      'HTTP',
      'O serviço de clientes está temporariamente indisponível. Tente novamente em instantes.',
      status,
    )
  }

  return new ErroApiClientes(
    'HTTP',
    'Não foi possível carregar os clientes. Confira a conexão e tente novamente.',
    status,
  )
}
