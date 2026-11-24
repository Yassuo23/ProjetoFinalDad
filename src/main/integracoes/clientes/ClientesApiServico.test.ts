import { describe, expect, it } from 'vitest'
import type { ConfiguracaoApiClientes } from './configuracao'
import { ErroConfiguracaoApiClientes, lerConfiguracaoApiClientes } from './configuracao'
import { ErroApiClientes } from './erros'
import { ClientesApiServico } from './ClientesApiServico'

const CONFIGURACAO: ConfiguracaoApiClientes = {
  urlBase: 'http://127.0.0.1:3199',
  timeoutMs: 5000,
}

const CORPO_API = {
  dados: [
    {
      id: 1,
      nome: 'Ana Souza',
      email: 'ana@exemplo.test',
      telefone: '(11) 98888-0001',
      cidade: 'São Paulo',
      uf: 'SP',
      campo_ignorado: 'descartado',
    },
  ],
  total: 1,
}

interface Chamada {
  readonly url: string
  readonly init: RequestInit
}

function respostaApi(corpo: unknown = CORPO_API): Response {
  return new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

async function capturarErro(promessa: Promise<unknown>): Promise<ErroApiClientes> {
  const erro = await promessa.catch((motivo: unknown) => motivo)
  if (!(erro instanceof ErroApiClientes)) {
    throw new Error(`Esperado ErroApiClientes, recebido: ${String(erro)}`)
  }
  return erro
}

describe('ClientesApiServico', () => {
  it('monta a query, aplica timeout e devolve somente o DTO validado', async () => {
    const chamadas: Chamada[] = []
    const http: typeof fetch = async (entrada, init) => {
      chamadas.push({ url: String(entrada), init: init ?? {} })
      return respostaApi()
    }
    const servico = new ClientesApiServico(CONFIGURACAO, http)

    const clientes = await servico.listar({ busca: '  ana  ', limite: 5 })

    expect(clientes).toHaveLength(1)
    expect(clientes[0]).toEqual({
      id: 1,
      nome: 'Ana Souza',
      email: 'ana@exemplo.test',
      telefone: '(11) 98888-0001',
      cep: undefined,
      logradouro: undefined,
      numero: undefined,
      complemento: undefined,
      bairro: undefined,
      cidade: 'São Paulo',
      uf: 'SP',
    })
    expect(chamadas[0].url).toBe('http://127.0.0.1:3199/clientes?q=ana&limite=5')
    expect(chamadas[0].init.method).toBe('GET')
    expect(chamadas[0].init.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(chamadas[0].init.headers).get('Accept')).toBe('application/json')
  })

  it('injeta o token de autenticação no main, nunca no renderer', async () => {
    let cabecalhos = new Headers()
    const http: typeof fetch = async (_entrada, init) => {
      cabecalhos = new Headers(init?.headers)
      return respostaApi()
    }
    const servico = new ClientesApiServico({ ...CONFIGURACAO, token: 'token-local' }, http)

    await servico.listar()

    expect(cabecalhos.get('Authorization')).toBe('Bearer token-local')
  })

  it('rejeita payload inválido da API sem vazar o corpo bruto', async () => {
    const http: typeof fetch = async () => respostaApi({ dados: [{ id: -1 }], total: 1 })
    const servico = new ClientesApiServico(CONFIGURACAO, http)

    const erro = await capturarErro(servico.listar())

    expect(erro.codigo).toBe('RESPOSTA_INVALIDA')
    expect(erro.message).not.toContain('campo_ignorado')
  })

  it('transforma JSON quebrado em erro amigável', async () => {
    const http: typeof fetch = async () => new Response('{quebrado', { status: 200 })
    const servico = new ClientesApiServico(CONFIGURACAO, http)

    const erro = await capturarErro(servico.listar())

    expect(erro.codigo).toBe('RESPOSTA_INVALIDA')
  })

  it('padroniza erros HTTP e de timeout', async () => {
    const http500: typeof fetch = async () => new Response('detalhe interno', { status: 500 })
    const erro500 = await capturarErro(new ClientesApiServico(CONFIGURACAO, http500).listar())
    expect(erro500.codigo).toBe('HTTP')
    expect(erro500.statusHttp).toBe(500)
    expect(erro500.message).not.toContain('detalhe interno')

    const timeout = new Error('expirou')
    timeout.name = 'TimeoutError'
    const httpLento: typeof fetch = async () => {
      throw timeout
    }
    const erroTimeout = await capturarErro(new ClientesApiServico(CONFIGURACAO, httpLento).listar())
    expect(erroTimeout.codigo).toBe('TIMEOUT')
  })
})

describe('lerConfiguracaoApiClientes', () => {
  it('exige URL base e aceita apenas HTTPS ou localhost', () => {
    expect(() => lerConfiguracaoApiClientes({})).toThrow(ErroConfiguracaoApiClientes)
    expect(() =>
      lerConfiguracaoApiClientes({ CLIENTES_API_BASE_URL: 'http://api.exemplo.com' }),
    ).toThrow(ErroConfiguracaoApiClientes)
    expect(
      lerConfiguracaoApiClientes({ CLIENTES_API_BASE_URL: 'https://api.exemplo.com' }).urlBase,
    ).toBe('https://api.exemplo.com')
  })

  it('usa timeout padrão e valida o intervalo', () => {
    expect(
      lerConfiguracaoApiClientes({ CLIENTES_API_BASE_URL: 'http://127.0.0.1:3199' }).timeoutMs,
    ).toBe(5000)
    expect(() =>
      lerConfiguracaoApiClientes({
        CLIENTES_API_BASE_URL: 'http://127.0.0.1:3199',
        CLIENTES_API_TIMEOUT_MS: '10',
      }),
    ).toThrow(ErroConfiguracaoApiClientes)
  })
})
