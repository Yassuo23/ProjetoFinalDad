import { ErroApiClientes } from './erros'

/** Configuração lida somente no main; nunca serializada para o renderer. */
export interface ConfiguracaoApiClientes {
  readonly urlBase: string
  readonly timeoutMs: number
  readonly token?: string
}

export class ErroConfiguracaoApiClientes extends ErroApiClientes {
  constructor(mensagem: string) {
    super('CONFIGURACAO', mensagem)
    this.name = 'ErroConfiguracaoApiClientes'
  }
}

function obrigatorio(nome: string, valor: string | undefined): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErroConfiguracaoApiClientes(`Variável de ambiente ${nome} não configurada.`)
  }
  return valor.trim()
}

function urlBase(nome: string, valor: string | undefined): string {
  const bruta = obrigatorio(nome, valor)
  let url: URL
  try {
    url = new URL(bruta)
  } catch {
    throw new ErroConfiguracaoApiClientes(`${nome} deve ser uma URL absoluta.`)
  }

  const localHttp =
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !localHttp) {
    throw new ErroConfiguracaoApiClientes(
      `${nome} deve usar HTTPS ou apontar para um servidor local (localhost/127.0.0.1).`,
    )
  }
  if (url.username || url.password) {
    throw new ErroConfiguracaoApiClientes(`${nome} não pode conter credenciais na URL.`)
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new ErroConfiguracaoApiClientes(
      `${nome} deve conter apenas o domínio e a porta (sem caminho, query ou fragmento).`,
    )
  }
  return bruta.replace(/\/+$/, '')
}

function timeout(valor: string | undefined): number {
  const ms = Number(valor ?? '5000')
  if (!Number.isInteger(ms) || ms < 1000 || ms > 60_000) {
    throw new ErroConfiguracaoApiClientes(
      'CLIENTES_API_TIMEOUT_MS deve ser um inteiro entre 1000 e 60000.',
    )
  }
  return ms
}

/** Falha cedo se a URL da API estiver ausente ou apontar para um host inesperado. */
export function lerConfiguracaoApiClientes(
  env: NodeJS.ProcessEnv = process.env,
): ConfiguracaoApiClientes {
  const token = env.CLIENTES_API_TOKEN?.trim()
  return {
    urlBase: urlBase('CLIENTES_API_BASE_URL', env.CLIENTES_API_BASE_URL),
    timeoutMs: timeout(env.CLIENTES_API_TIMEOUT_MS),
    ...(token ? { token } : {}),
  }
}
